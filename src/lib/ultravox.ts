import { 
  UltraVoxCall, 
  UltraVoxCallStage, 
  FlowData, 
  FlowNode, 
  FlowExecutionContext,
  StageTransition,
  SelectedTool
} from '../types';

// Types for ultravox-client (dynamic import)
interface UltravoxSession {
  registerToolImplementation(name: string, implementation: ClientToolImplementation): void;
  joinCall(joinUrl: string): Promise<void>;
  leaveCall(): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  status: string;
  transcripts: Array<{ speaker: string; text: string }>;
  isSpeakerMuted: boolean;
  isMicMuted: boolean;
  muteMic(): void;
  unmuteMic(): void;
  muteSpeaker(): void;
  unmuteSpeaker(): void;
}

interface UltravoxSessionConstructor {
  new (): UltravoxSession;
}

type ClientToolImplementation = (parameters: Record<string, unknown>) => string | Promise<string>;

// Dynamic import function for UltravoxSession
async function getUltravoxSession(): Promise<UltravoxSessionConstructor> {
  try {
    const ultravoxModule = await import('ultravox-client');
    return ultravoxModule.UltravoxSession as unknown as UltravoxSessionConstructor;
  } catch (error) {
    console.error('❌ ultravox-client not available:', error);
    throw new Error('UltraVox client library not available');
  }
}

export class UltraVoxFlowService {
  private apiKey: string;
  private currentSession: UltravoxSession | null = null;
  private executionContext: FlowExecutionContext | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create a new UltraVox call for the flow
   * This now uses the server-side API route to avoid CORS issues
   */
  async createCall(flowData: FlowData, startNodeId?: string): Promise<UltraVoxCall> {
    console.log('🔄 Starting UltraVox call creation...');
    
    const startNode = startNodeId 
      ? flowData.nodes.find(n => n.id === startNodeId)
      : flowData.nodes.find(n => n.type === 'start');
    
    if (!startNode) {
      throw new Error('No start node found in flow');
    }

    // Generate initial system prompt based on the start node
    const systemPrompt = this.generateSystemPromptForNode(startNode);
    
    // Create call config matching the working voice-flow-builder format
    const callConfig = {
      systemPrompt: systemPrompt,
      model: 'fixie-ai/ultravox-70B',
      voice: 'Mark',
      temperature: 0.4,
      firstSpeaker: 'FIRST_SPEAKER_AGENT',
      initialOutputMedium: 'MESSAGE_MEDIUM_VOICE',
      maxDuration: '1800s',
      recordingEnabled: true,
      metadata: {
        flowId: `flow_${Date.now()}`,
        startNodeId: startNode.id,
        nodeType: startNode.type
      }
    };

    console.log('📞 Creating Ultravox call with config:', callConfig);

    // Call our server-side API route (matching working pattern)
    try {
      const response = await fetch('/api/ultravox/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callConfig)
      });

      console.log('📡 API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API call failed:', response.status, response.statusText);
        console.error('❌ Error response:', errorData);
        
        if (errorData.error && errorData.error.includes('Invalid API key')) {
          throw new Error('Invalid Ultravox API key. Please check your NEXT_PUBLIC_ULTRAVOX_API_KEY environment variable.');
        }
        
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const call: UltraVoxCall = await response.json();
      console.log('✅ Call creation response:', JSON.stringify(call, null, 2));
      console.log('🔗 JoinUrl received:', call.joinUrl);

      // Validate the response has required fields
      if (!call) {
        throw new Error('API returned null/undefined call object');
      }

      if (!call.joinUrl) {
        console.error('❌ Missing joinUrl in response:', call);
        throw new Error('API response missing required joinUrl field');
      }

      if (!call.joinUrl.startsWith('wss://')) {
        console.error('❌ Invalid joinUrl format:', call.joinUrl);
        throw new Error(`Invalid joinUrl format: ${call.joinUrl}`);
      }

      console.log('✅ Valid call object created with joinUrl:', call.joinUrl);

      // Initialize execution context
      this.executionContext = {
        flowData,
        currentNodeId: startNode.id,
        variables: {},
        callStageHistory: [],
        ultravoxCall: call
      };

      return call;

    } catch (error) {
      console.error('❌ Call creation failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error during call creation: ${String(error)}`);
    }
  }

  /**
   * Join a call using the UltraVox SDK - simplified approach
   */
  async joinCall(joinUrl: string): Promise<void> {
    console.log('🔊 Attempting to join call with URL:', joinUrl);
    
    // Validate joinUrl before proceeding
    if (!joinUrl) {
      console.error('❌ Join URL is null or undefined');
      throw new Error('Join URL is required but was not provided');
    }
    
    if (typeof joinUrl !== 'string') {
      console.error('❌ Join URL is not a string:', typeof joinUrl, joinUrl);
      throw new Error(`Join URL must be a string, got ${typeof joinUrl}`);
    }
    
    if (!joinUrl.startsWith('wss://')) {
      console.error('❌ Invalid join URL format:', joinUrl);
      throw new Error(`Invalid join URL format: ${joinUrl}. Must start with wss://`);
    }

    // Clean up any existing session
    if (this.currentSession) {
      console.log('🔄 Leaving existing session...');
      try {
        await this.currentSession.leaveCall();
      } catch (error) {
        console.warn('⚠️ Error leaving previous session:', error);
      }
    }

    console.log('🎤 Creating new UltraVox session...');
    try {
      // Use dynamic import like working voice-flow-builder
      const UltravoxSessionClass = await getUltravoxSession();
      this.currentSession = new UltravoxSessionClass();
      console.log('✅ UltraVox session created successfully');

      // Setup essential event listeners BEFORE joining
      this.setupSessionEventListeners();

      // Register flow navigation tools
      this.registerFlowTools();

      console.log('🌐 Joining call with validated URL:', joinUrl);
      console.log('📊 Session state before join:', {
        hasSession: !!this.currentSession,
        sessionType: this.currentSession?.constructor?.name
      });

      // Join the WebSocket connection
      await this.currentSession.joinCall(joinUrl);
      console.log('✅ Successfully joined UltraVox call');
      
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📊 Session state after join:', {
        status: this.currentSession?.status,
        hasTranscripts: !!this.currentSession?.transcripts,
        isSpeakerMuted: this.currentSession?.isSpeakerMuted,
        isMicMuted: this.currentSession?.isMicMuted
      });
      
    } catch (error) {
      console.error('❌ Failed to join UltraVox call:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('📝 Error message:', error instanceof Error ? error.message : String(error));
      console.error('📝 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Clean up failed session
      if (this.currentSession) {
        try {
          await this.currentSession.leaveCall();
        } catch (cleanupError) {
          console.warn('⚠️ Error during cleanup:', cleanupError);
        }
        this.currentSession = null;
      }
      
      throw new Error(`WebSocket connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transition to a new call stage based on flow navigation
   */
  async transitionToStage(transition: StageTransition): Promise<void> {
    if (!this.executionContext) {
      throw new Error('No execution context available');
    }

    const targetNode = this.executionContext.flowData.nodes.find(
      n => n.id === transition.toNodeId
    );

    if (!targetNode) {
      throw new Error(`Target node ${transition.toNodeId} not found`);
    }

    // Create new stage configuration
    const stageConfig = this.createStageConfigForNode(targetNode);
    
    // Send stage transition request via server-side API
    const response = await this.sendStageTransition(stageConfig, transition);

    if (response.ok) {
      // Update execution context
      this.executionContext.currentNodeId = transition.toNodeId;
      this.executionContext.callStageHistory.push(transition.toNodeId);

      // Store any transition data in variables
      if (transition.data) {
        Object.assign(this.executionContext.variables, transition.data);
      }
    }
  }

  /**
   * Get current call stage information
   */
  async getCurrentStage(): Promise<UltraVoxCallStage | null> {
    if (!this.executionContext?.ultravoxCall) {
      return null;
    }

    const callId = this.executionContext.ultravoxCall.id;
    const stages = await this.getCallStages(callId);
    
    return stages.length > 0 ? stages[stages.length - 1] : null;
  }

  /**
   * Get all stages for a call via server-side API
   */
  async getCallStages(callId: string): Promise<UltraVoxCallStage[]> {
    const response = await fetch(`/api/ultravox/calls/${callId}/stages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get call stages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get specific call stage via server-side API
   */
  async getCallStage(callId: string, stageId: string): Promise<UltraVoxCallStage> {
    const response = await fetch(`/api/ultravox/calls/${callId}/stages/${stageId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get call stage: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * End the current call with improved error handling
   */
  async endCall(): Promise<void> {
    console.log('🔚 Attempting to end UltraVox call...');
    
    if (this.currentSession) {
      try {
        console.log('📤 Leaving UltraVox session...');
        
        // Set a timeout for the leaveCall operation
        const leaveCallPromise = this.currentSession.leaveCall();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Leave call timeout')), 5000)
        );
        
        await Promise.race([leaveCallPromise, timeoutPromise]);
        console.log('✅ Successfully left UltraVox session');
        
      } catch (error) {
        console.warn('⚠️ Error while leaving call (forcing cleanup):', error);
        // Force cleanup even if leaveCall fails
      } finally {
        // Always clean up the session reference
        this.currentSession = null;
        console.log('🧹 Session reference cleared');
      }
    } else {
      console.log('ℹ️ No active session to end');
    }
    
    // Always clean up execution context
    this.executionContext = null;
    console.log('✅ Call ended and context cleared');
  }

  /**
   * Get current execution context
   */
  getExecutionContext(): FlowExecutionContext | null {
    return this.executionContext;
  }

  /**
   * Get current session for external access (e.g., mute controls)
   */
  getCurrentSession(): UltravoxSession | null {
    return this.currentSession;
  }

  // Private helper methods

  private generateSystemPromptForNode(node: FlowNode): string {
    // Use custom prompt if provided, otherwise generate default prompt
    if (node.data.customPrompt && node.data.customPrompt.trim()) {
      const customPromptBase = `You are an AI assistant helping users navigate through a conversational flow.
      
Current node: ${node.type}
Node ID: ${node.id}

CUSTOM INSTRUCTIONS:
${node.data.customPrompt}

If you need to move to the next step in the conversation, use the 'navigateFlow' tool.`;
      return customPromptBase;
    }

    // Default prompt generation (existing logic)
    const basePrompt = `You are an AI assistant helping users navigate through a conversational flow.
    
Current node: ${node.type}
Node ID: ${node.id}
`;

    switch (node.type) {
      case 'start':
        return `${basePrompt}
        
You are starting a new conversation. ${node.data.content || 'Welcome! How can I help you today?'}

If you need to move to the next step in the conversation, use the 'navigateFlow' tool.`;

      case 'message':
        return `${basePrompt}
        
Deliver this message to the user: "${node.data.content || node.data.label}"

After delivering the message, use the 'navigateFlow' tool to move to the next step.`;

      case 'question':
        const options = node.data.options?.map(opt => opt.text).join(', ') || '';
        return `${basePrompt}
        
Ask the user this question: "${node.data.question || node.data.content}"
${options ? `Available options: ${options}` : ''}

When you receive their response, use the 'navigateFlow' tool with their answer to proceed.`;

      case 'condition':
        return `${basePrompt}
        
This is a conditional node that evaluates user responses.
Condition: ${node.data.condition?.operator} "${node.data.condition?.value}"

Use the 'evaluateCondition' tool to determine the next step based on the condition.`;

      default:
        return basePrompt;
    }
  }

  private generateToolsForNode(node: FlowNode): SelectedTool[] {
    const tools: SelectedTool[] = [];

    // Add navigation tool for all nodes
    tools.push({
      temporaryTool: {
        modelToolName: 'navigateFlow',
        description: 'Navigate to the next node in the conversational flow',
        dynamicParameters: [
          {
            name: 'nodeId',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'The ID of the next node to navigate to'
            },
            required: true
          },
          {
            name: 'userResponse',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'The user response that triggered this navigation'
            },
            required: false
          }
        ],
        http: {
          baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flow/navigate`,
          httpMethod: 'POST'
        }
      }
    });

    // Add condition evaluation tool for condition nodes
    if (node.type === 'condition') {
      tools.push({
        temporaryTool: {
          modelToolName: 'evaluateCondition',
          description: 'Evaluate a condition and determine the next flow step',
          dynamicParameters: [
            {
              name: 'userInput',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The user input to evaluate against the condition'
              },
              required: true
            },
            {
              name: 'conditionValue',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The expected value for the condition'
              },
              required: true
            },
            {
              name: 'operator',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                enum: ['equals', 'contains'],
                description: 'The comparison operator'
              },
              required: true
            }
          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flow/evaluate`,
            httpMethod: 'POST'
          }
        }
      });
    }

    return tools;
  }

  private createStageConfigForNode(node: FlowNode): Partial<UltraVoxCallStage> {
    return {
      systemPrompt: this.generateSystemPromptForNode(node),
      model: 'fixie-ai/ultravox',
      voice: 'Mark',
      temperature: 0.7,
      initialState: {
        nodeId: node.id,
        nodeType: node.type,
        variables: this.executionContext!.variables
      }
    };
  }

  private async sendStageTransition(
    stageConfig: Partial<UltraVoxCallStage>,
    transition: StageTransition
  ): Promise<Response> {
    // Mark parameters as used for future implementation
    void stageConfig;
    void transition;
    
    // This would be called from within a tool handler
    // For now, we'll return a mock response
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private registerFlowTools(): void {
    if (!this.currentSession) return;

    // Register navigation tool
    this.currentSession.registerToolImplementation('navigateFlow', async (parameters) => {
      const { nodeId, userResponse } = parameters as { nodeId: string; userResponse?: string };
      
      const transition: StageTransition = {
        toNodeId: nodeId,
        trigger: 'tool_call',
        data: userResponse ? { lastUserResponse: userResponse } : undefined
      };

      await this.transitionToStage(transition);
      return `Successfully navigated to node ${nodeId}`;
    });

    // Register condition evaluation tool
    this.currentSession.registerToolImplementation('evaluateCondition', async (parameters) => {
      const { userInput, conditionValue, operator } = parameters as {
        userInput: string;
        conditionValue: string;
        operator: 'equals' | 'contains';
      };

      let conditionMet = false;

      switch (operator) {
        case 'equals':
          conditionMet = userInput.toLowerCase().trim() === conditionValue.toLowerCase().trim();
          break;
        case 'contains':
          conditionMet = userInput.toLowerCase().includes(conditionValue.toLowerCase());
          break;
      }

      // Find the appropriate next node based on condition result
      if (this.executionContext) {
        const currentNode = this.executionContext.flowData.nodes.find(
          n => n.id === this.executionContext!.currentNodeId
        );
        
        if (currentNode) {
          // Find edges from current node
          const edges = this.executionContext.flowData.edges.filter(
            e => e.source === currentNode.id
          );
          
          // Simple logic: first edge for true, second for false
          const targetEdge = edges[conditionMet ? 0 : 1] || edges[0];
          
          if (targetEdge) {
            const transition: StageTransition = {
              toNodeId: targetEdge.target,
              trigger: 'condition_met',
              data: { 
                conditionResult: conditionMet,
                userInput,
                conditionValue,
                operator
              }
            };

            await this.transitionToStage(transition);
          }
        }
      }

      return `Condition ${conditionMet ? 'met' : 'not met'}. User input: "${userInput}" ${operator} "${conditionValue}"`;
    });
  }

  private setupSessionEventListeners(): void {
    if (!this.currentSession) return;

    console.log('🎧 Setting up essential UltraVox session event listeners...');

    // Core session events
    this.currentSession.addEventListener('status', (event) => {
      console.log('📡 Session status changed:', this.currentSession?.status, event);
      
      // Log when agent starts speaking
      if (this.currentSession?.status === 'speaking') {
        console.log('🗣️ Agent is speaking - checking audio setup...');
        console.log('🔊 Speaker muted:', this.currentSession?.isSpeakerMuted);
        console.log('🎤 Mic muted:', this.currentSession?.isMicMuted);
      }
    });

    this.currentSession.addEventListener('transcripts', (event) => {
      console.log('📝 Transcripts updated:', this.currentSession?.transcripts, event);
    });

    // Audio-specific events to debug
    this.currentSession.addEventListener('audio', (event) => {
      console.log('🔊 Audio event:', event);
    });

    this.currentSession.addEventListener('speaking', (event) => {
      console.log('🗣️ Speaking event:', event);
    });

    this.currentSession.addEventListener('output', (event) => {
      console.log('📤 Output event:', event);
    });

    // Connection events
    this.currentSession.addEventListener('connect', (event) => {
      console.log('🔗 Connection established:', event);
    });

    // Error handling
    this.currentSession.addEventListener('error', (event) => {
      console.error('❌ UltraVox session error:', event);
    });

    // WebSocket connection events
    this.currentSession.addEventListener('disconnect', (event) => {
      console.warn('🔌 Session disconnected:', event);
    });

    this.currentSession.addEventListener('reconnect', (event) => {
      console.log('🔄 Session reconnected:', event);
    });

    console.log('✅ Enhanced event listeners configured successfully');
  }

  // Audio methods removed - UltraVox SDK handles audio internally
}

// Singleton instance
let ultravoxService: UltraVoxFlowService | null = null;

export function getUltraVoxService(apiKey?: string): UltraVoxFlowService {
  if (!ultravoxService) {
    if (!apiKey) {
      throw new Error('UltraVox API key is required for first initialization');
    }
    ultravoxService = new UltraVoxFlowService(apiKey);
  }
  return ultravoxService;
}

 
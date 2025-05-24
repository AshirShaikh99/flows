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
  private stageChangeCallback?: (nodeId: string) => void;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Set callback for stage changes to update UI
   */
  setStageChangeCallback(callback: (nodeId: string) => void): void {
    this.stageChangeCallback = callback;
  }

  /**
   * Create a new UltraVox call for the flow with Call Stages support
   */
  async createCall(flowData: FlowData, startNodeId?: string): Promise<UltraVoxCall> {
    console.log('🔄 Starting UltraVox call creation with Call Stages...');
    
    // Validate that BASE_URL is HTTPS (required by UltraVox)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    if (!baseUrl.startsWith('https://')) {
      throw new Error(
        `UltraVox requires HTTPS for tool endpoints. Current BASE_URL: ${baseUrl}\n\n` +
        `To fix this:\n` +
        `1. Install ngrok: brew install ngrok/ngrok/ngrok\n` +
        `2. Start ngrok: ngrok http 3000\n` +
        `3. Update NEXT_PUBLIC_BASE_URL in .env.local with your ngrok HTTPS URL\n` +
        `4. Restart your development server\n\n` +
        `See NGROK_SETUP.md for detailed instructions.`
      );
    }
    
    const startNode = startNodeId 
      ? flowData.nodes.find(n => n.id === startNodeId)
      : flowData.nodes.find(n => n.type === 'start');
    
    if (!startNode) {
      throw new Error('No start node found in flow');
    }

    // Generate initial system prompt and tools for the start node
    const systemPrompt = this.generateSystemPromptForNode(startNode);
    const selectedTools = this.generateToolsForNode(startNode);
    
    // Create call config with Call Stages support
    const callConfig = {
      systemPrompt: systemPrompt,
      model: 'fixie-ai/ultravox-70B',
      voice: 'Mark',
      temperature: 0.4,
      firstSpeaker: 'FIRST_SPEAKER_AGENT',
      initialOutputMedium: 'MESSAGE_MEDIUM_VOICE',
      maxDuration: '1800s',
      recordingEnabled: true,
      selectedTools: selectedTools,
      metadata: {
        flowId: `flow_${Date.now()}`,
        startNodeId: startNode.id,
        nodeType: startNode.type,
        hasCallStages: 'true'
      }
    };

    console.log('📞 Creating Ultravox call with Call Stages config:', callConfig);

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
      if (!call || !call.joinUrl) {
        throw new Error('API response missing required fields');
      }

      if (!call.joinUrl.startsWith('wss://')) {
        throw new Error(`Invalid joinUrl format: ${call.joinUrl}`);
      }

      console.log('✅ Valid call object created with Call Stages support');

      // Initialize execution context
      this.executionContext = {
        flowData,
        currentNodeId: startNode.id,
        variables: {},
        callStageHistory: [startNode.id],
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
   * Join a call using the UltraVox SDK with Call Stages support
   */
  async joinCall(joinUrl: string): Promise<void> {
    console.log('🔊 Attempting to join call with Call Stages support:', joinUrl);
    
    // Validate joinUrl
    if (!joinUrl || typeof joinUrl !== 'string' || !joinUrl.startsWith('wss://')) {
      throw new Error(`Invalid join URL format: ${joinUrl}`);
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

    console.log('🎤 Creating new UltraVox session with Call Stages...');
    try {
      const UltravoxSessionClass = await getUltravoxSession();
      this.currentSession = new UltravoxSessionClass();
      console.log('✅ UltraVox session created successfully');

      // Setup event listeners BEFORE joining
      this.setupSessionEventListeners();

      // Register Call Stages tools
      this.registerCallStageTools();

      // Join the call
      console.log('🔗 Joining call...');
      await this.currentSession.joinCall(joinUrl);
      console.log('✅ Successfully joined call with Call Stages support');

    } catch (error) {
      console.error('❌ Failed to join call:', error);
      this.currentSession = null;
      throw error;
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

    console.log(`🔄 Transitioning to stage: ${transition.toNodeId} (${targetNode.type})`);

    // Update execution context
    this.executionContext.currentNodeId = transition.toNodeId;
    this.executionContext.callStageHistory.push(transition.toNodeId);

    // Store any transition data in variables
    if (transition.data) {
      Object.assign(this.executionContext.variables, transition.data);
    }

    // Notify UI of stage change
    if (this.stageChangeCallback) {
      this.stageChangeCallback(transition.toNodeId);
    }

    console.log(`✅ Successfully transitioned to node: ${transition.toNodeId}`);
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
        
        const leaveCallPromise = this.currentSession.leaveCall();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Leave call timeout')), 5000)
        );
        
        await Promise.race([leaveCallPromise, timeoutPromise]);
        console.log('✅ Successfully left UltraVox session');
        
      } catch (error) {
        console.warn('⚠️ Error while leaving call (forcing cleanup):', error);
      } finally {
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

You have access to a 'changeStage' tool that will automatically determine the next node based on the conversation flow and user responses. When calling this tool, always include the user's response in the 'userResponse' parameter.`;
      return customPromptBase;
    }

    // Default prompt generation
    const basePrompt = `You are an AI assistant helping users navigate through a conversational flow.
    
Current node: ${node.type}
Node ID: ${node.id}
`;

    switch (node.type) {
      case 'start':
        return `${basePrompt}
        
You are starting a new conversation. ${node.data.content || 'Welcome! How can I help you today?'}

Use the 'changeStage' tool when you need to move to the next step in the conversation. The tool will automatically determine the correct next node. Include any user response in the 'userResponse' parameter.`;

      case 'message':
        return `${basePrompt}
        
Deliver this message to the user: "${node.data.content || node.data.label}"

After delivering the message, use the 'changeStage' tool to move to the next step. The tool will automatically determine the next node.`;

      case 'question':
        const options = node.data.options?.map(opt => opt.text).join(', ') || '';
        return `${basePrompt}
        
Ask the user this question: "${node.data.question || node.data.content}"
${options ? `Available options: ${options}` : ''}

When you receive their response, use the 'changeStage' tool with their answer in the 'userResponse' parameter. The tool will automatically determine the appropriate next node based on their response.`;

      case 'condition':
        return `${basePrompt}

This is a conditional node that evaluates user responses.
Condition: ${node.data?.condition?.operator || 'equals'} "${node.data?.condition?.value || ''}"

When you receive a user response, use the 'changeStage' tool and include the user's exact response in the 'userResponse' parameter. The system will automatically evaluate the condition and navigate to the appropriate next node.`;

      default:
        return `${basePrompt}

Process this node and use the 'changeStage' tool to continue the conversation flow. Always include any user response in the 'userResponse' parameter. The tool will automatically determine the next node.`;
    }
  }

  private generateToolsForNode(node: FlowNode): SelectedTool[] {
    const tools: SelectedTool[] = [
      {
        temporaryTool: {
          modelToolName: 'changeStage',
          description: 'Transition to the next stage in the conversation flow',
          dynamicParameters: [
            {
              name: 'userResponse',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The user\'s response that triggered this transition'
              },
              required: false
            }
          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flow/navigate`,
            httpMethod: 'POST'
          }
        }
      }
    ];

    // Add condition evaluation tool for condition nodes
    if (node.type === 'condition') {
      tools.push({
        temporaryTool: {
          modelToolName: 'evaluateCondition',
          description: 'Evaluate a condition against user input',
          dynamicParameters: [
            {
              name: 'userInput',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The user input to evaluate'
              },
              required: true
            },
            {
              name: 'conditionValue',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The value to compare against'
              },
              required: true
            },
            {
              name: 'operator',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The comparison operator'
              },
              required: true
            }
          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flow/evaluate-condition`,
            httpMethod: 'POST'
          }
        }
      });
    }

    return tools;
  }

  private registerCallStageTools(): void {
    if (!this.currentSession) return;

    console.log('🔧 Registering Call Stages tools...');

    // Register stage change tool - this will be called by the agent
    this.currentSession.registerToolImplementation('changeStage', async (parameters) => {
      const { nodeId, userResponse, callId } = parameters as { 
        nodeId?: string; 
        userResponse?: string;
        callId?: string;
      };
      
      console.log('🔄 changeStage tool called:', { nodeId, userResponse, callId });

      if (!this.executionContext) {
        throw new Error('No execution context available');
      }

      let targetNodeId = nodeId;

      // If no specific nodeId provided, try to determine next node based on current node and flow structure
      if (!targetNodeId) {
        targetNodeId = this.determineNextNode(userResponse);
      }

      if (!targetNodeId) {
        throw new Error('Unable to determine target node for navigation');
      }

      // Validate that the target node exists
      const targetNode = this.executionContext.flowData.nodes.find(n => n.id === targetNodeId);
      if (!targetNode) {
        throw new Error(`Target node ${targetNodeId} not found in flow`);
      }

      const transition: StageTransition = {
        toNodeId: targetNodeId,
        trigger: 'tool_call',
        data: userResponse ? { lastUserResponse: userResponse } : undefined
      };

      await this.transitionToStage(transition);
      return `Successfully navigated to node ${targetNodeId}`;
    });

    // Register condition evaluation tool
    this.currentSession.registerToolImplementation('evaluateCondition', async (parameters) => {
      const { userInput, conditionValue, operator } = parameters as {
        userInput: string;
        conditionValue: string;
        operator: 'equals' | 'contains';
      };

      console.log('🔍 evaluateCondition tool called:', { userInput, conditionValue, operator });

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

    console.log('✅ Call Stages tools registered successfully');
  }

  /**
   * Determine the next node to navigate to based on current context and user response
   */
  private determineNextNode(userResponse?: string): string | undefined {
    if (!this.executionContext) return undefined;

    const currentNode = this.executionContext.flowData.nodes.find(
      n => n.id === this.executionContext!.currentNodeId
    );

    if (!currentNode) return undefined;

    // Find edges from current node
    const edges = this.executionContext.flowData.edges.filter(
      e => e.source === currentNode.id
    );

    if (edges.length === 0) return undefined;

    // For condition nodes, evaluate the condition and pick appropriate edge
    if (currentNode.type === 'condition') {
      const condition = currentNode.data?.condition;
      if (condition && userResponse) {
        let conditionMet = false;
        
        switch (condition.operator) {
          case 'equals':
            conditionMet = userResponse.toLowerCase().trim() === condition.value.toLowerCase().trim();
            break;
          case 'contains':
            conditionMet = userResponse.toLowerCase().includes(condition.value.toLowerCase());
            break;
        }

        // Use first edge for true condition, second for false
        const targetEdge = edges[conditionMet ? 0 : 1] || edges[0];
        return targetEdge?.target || undefined;
      }
    }

    // For other node types, just use the first available edge
    return edges[0]?.target || undefined;
  }

  private setupSessionEventListeners(): void {
    if (!this.currentSession) return;

    console.log('🎧 Setting up Call Stages session event listeners...');

    // Core session events
    this.currentSession.addEventListener('status', (event) => {
      console.log('📡 Session status changed:', this.currentSession?.status, event);
    });

    this.currentSession.addEventListener('transcripts', (event) => {
      console.log('📝 Transcripts updated:', this.currentSession?.transcripts, event);
    });

    // Error handling
    this.currentSession.addEventListener('error', (event) => {
      console.error('❌ UltraVox session error:', event);
    });

    // Connection events
    this.currentSession.addEventListener('disconnect', (event) => {
      console.warn('🔌 Session disconnected:', event);
    });

    this.currentSession.addEventListener('reconnect', (event) => {
      console.log('🔄 Session reconnected:', event);
    });

    console.log('✅ Call Stages event listeners configured successfully');
  }
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

 
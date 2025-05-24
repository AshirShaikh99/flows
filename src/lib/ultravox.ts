import { UltravoxSession } from 'ultravox-client';
import { 
  UltraVoxCall, 
  UltraVoxCallStage, 
  FlowData, 
  FlowNode, 
  FlowExecutionContext,
  StageTransition,
  SelectedTool
} from '../types';

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
    const startNode = startNodeId 
      ? flowData.nodes.find(n => n.id === startNodeId)
      : flowData.nodes.find(n => n.type === 'start');
    
    if (!startNode) {
      throw new Error('No start node found in flow');
    }

    // Generate initial system prompt based on the start node
    const initialPrompt = this.generateSystemPromptForNode(startNode, flowData);
    
    // Create call config with proper first speaker message and tools
    const firstSpeakerText = startNode.data.content && startNode.data.content.trim() !== '' && startNode.data.content !== 'Start'
      ? startNode.data.content
      : "Hello! I'm here to help you navigate through this conversation flow. How can I assist you today?";

    const callConfig = {
      systemPrompt: initialPrompt,
      model: 'fixie-ai/ultravox',
      voice: 'Mark',
      temperature: 0.7,
      firstSpeaker: 'FIRST_SPEAKER_AGENT',
      firstSpeakerSettings: {
        agent: {
          text: firstSpeakerText
        }
      },
      medium: {
        serverWebSocket: {
          inputSampleRate: 48000,
          outputSampleRate: 48000,
        }
      },
      // Temporarily disable tools to debug WebSocket connection issues
      // selectedTools: this.generateToolsForNode(startNode, flowData),
      metadata: {
        flowId: `flow_${Date.now()}`,
        startNodeId: startNode.id,
        nodeType: startNode.type
      }
    };

    // Call our server-side API route instead of Ultravox directly
    const response = await fetch('/api/ultravox/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callConfig,
        apiKey: this.apiKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create call: ${response.statusText} - ${errorText}`);
    }

    const call: UltraVoxCall = await response.json();

    // Initialize execution context
    this.executionContext = {
      flowData,
      currentNodeId: startNode.id,
      variables: {},
      callStageHistory: [],
      ultravoxCall: call
    };

    return call;
  }

  /**
   * Join a call using the SDK with enhanced error handling
   */
  async joinCall(joinUrl: string): Promise<void> {
    console.log('🔊 Attempting to join call with URL:', joinUrl);
    
    if (!joinUrl) {
      throw new Error('Join URL is required');
    }
    
    if (!joinUrl.startsWith('wss://')) {
      throw new Error(`Invalid join URL format: ${joinUrl}`);
    }

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
      this.currentSession = new UltravoxSession({
        experimentalMessages: new Set(['debug'])
      });
      console.log('✅ UltraVox session created successfully');

      // Setup event listeners before joining
      this.setupSessionEventListeners();

      // Register flow navigation tools
      this.registerFlowTools();

      console.log('🌐 Calling joinCall with URL:', joinUrl);
      await this.currentSession.joinCall(joinUrl);
      console.log('✅ Successfully joined UltraVox call');
      
      // Wait a moment for the connection to establish and check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('📊 Session status after join:', this.currentSession.status);
      
      // Try to trigger audio context if it's suspended
      this.ensureAudioContext();
      
    } catch (error) {
      console.error('❌ Failed to join UltraVox call:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('📝 Error details:', JSON.stringify(error, null, 2));
      throw new Error(`WebSocket connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure audio context is running (fixes Safari/Chrome autoplay restrictions)
   */
  private ensureAudioContext(): void {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          console.log('🔊 Audio context suspended, attempting to resume...');
          audioContext.resume().then(() => {
            console.log('✅ Audio context resumed successfully');
          }).catch((error) => {
            console.warn('⚠️ Failed to resume audio context:', error);
          });
        } else {
          console.log('✅ Audio context state:', audioContext.state);
        }
      }
    } catch (error) {
      console.warn('⚠️ Audio context check failed:', error);
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

  // Private helper methods

  private generateSystemPromptForNode(node: FlowNode, flowData: FlowData): string {
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

  private generateToolsForNode(node: FlowNode, flowData: FlowData): SelectedTool[] {
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
      systemPrompt: this.generateSystemPromptForNode(node, this.executionContext!.flowData),
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

    console.log('🎧 Setting up UltraVox session event listeners...');

    this.currentSession.addEventListener('status', (event) => {
      console.log('📡 UltraVox session status changed:', this.currentSession?.status, event);
    });

    this.currentSession.addEventListener('transcripts', (event) => {
      console.log('📝 Transcripts updated:', this.currentSession?.transcripts, event);
    });

    this.currentSession.addEventListener('experimental_message', (msg) => {
      console.log('🔬 UltraVox debug message:', JSON.stringify(msg));
    });

    // Add more specific event listeners for debugging
    this.currentSession.addEventListener('audio', (event) => {
      console.log('🔊 Audio event:', event);
    });

    this.currentSession.addEventListener('error', (event) => {
      console.error('❌ UltraVox session error:', event);
    });

    console.log('✅ Event listeners set up successfully');
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

 
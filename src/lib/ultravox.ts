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
  private baseUrl: string = 'https://api.ultravox.ai/api';
  private currentSession: UltravoxSession | null = null;
  private executionContext: FlowExecutionContext | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create a new UltraVox call for the flow
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
    
    // Create the call
    const callConfig = {
      systemPrompt: initialPrompt,
      model: 'fixie-ai/ultravox',
      voice: 'Mark',
      temperature: 0.7,
      firstSpeaker: 'FIRST_SPEAKER_AGENT',
      medium: {
        serverWebSocket: {
          inputSampleRate: 48000,
          outputSampleRate: 48000,
        }
      },
      selectedTools: this.generateToolsForNode(startNode, flowData),
      metadata: {
        flowId: `flow_${Date.now()}`,
        startNodeId: startNode.id,
        nodeType: startNode.type
      }
    };

    const response = await fetch(`${this.baseUrl}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(callConfig)
    });

    if (!response.ok) {
      throw new Error(`Failed to create call: ${response.statusText}`);
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
   * Join a call using the SDK
   */
  async joinCall(joinUrl: string): Promise<void> {
    if (this.currentSession) {
      await this.currentSession.leaveCall();
    }

    this.currentSession = new UltravoxSession({
      experimentalMessages: new Set(['debug'])
    });

    // Register flow navigation tools
    this.registerFlowTools();

    // Listen for session events
    this.setupSessionEventListeners();

    // Join the call
    this.currentSession.joinCall(joinUrl);
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
    
    // Send stage transition request
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
   * Get all stages for a call
   */
  async getCallStages(callId: string): Promise<UltraVoxCallStage[]> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/stages`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get call stages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get specific call stage
   */
  async getCallStage(callId: string, stageId: string): Promise<UltraVoxCallStage> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}/stages/${stageId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get call stage: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    if (this.currentSession) {
      await this.currentSession.leaveCall();
      this.currentSession = null;
    }
    this.executionContext = null;
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
            location: 'BODY',
            schema: {
              type: 'string',
              description: 'The ID of the next node to navigate to'
            },
            required: true
          },
          {
            name: 'userResponse',
            location: 'BODY',
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
              location: 'BODY',
              schema: {
                type: 'string',
                description: 'The user input to evaluate against the condition'
              },
              required: true
            },
            {
              name: 'conditionValue',
              location: 'BODY',
              schema: {
                type: 'string',
                description: 'The expected value for the condition'
              },
              required: true
            },
            {
              name: 'operator',
              location: 'BODY',
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

    this.currentSession.addEventListener('status', (event) => {
      console.log('UltraVox session status:', this.currentSession?.status);
    });

    this.currentSession.addEventListener('transcripts', (event) => {
      console.log('Transcripts updated:', this.currentSession?.transcripts);
    });

    this.currentSession.addEventListener('experimental_message', (msg) => {
      console.log('Debug message:', JSON.stringify(msg));
    });
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

 
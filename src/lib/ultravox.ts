import { 
  UltraVoxCall, 
  UltraVoxCallStage, 
  FlowData, 
  FlowNode, 
  FlowExecutionContext,
  StageTransition,
  SelectedTool
} from '../types';
import { registerCallIdMapping } from '../app/api/flow/shared-flow-data';

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
  private instanceId: string;
  private currentCallId: string | null = null; // Add explicit call ID storage

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.instanceId = `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🏗️ UltraVoxFlowService instance created:', this.instanceId);
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
    
    // Get global Ultravox settings or use defaults
    const defaultSettings = {
      voice: 'Mark',
      model: 'fixie-ai/ultravox',
      temperature: 0.4,
      languageHint: 'en',
      recordingEnabled: true,
      maxDuration: '1800s',
      firstSpeaker: 'FIRST_SPEAKER_AGENT'
    };
    
    const ultravoxSettings = flowData.ultravoxSettings || defaultSettings;
    console.log('⚙️ Using Ultravox settings:', ultravoxSettings);
    
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

    // CRITICAL FIX: Find the first meaningful conversation node
    // If start node connects to a workflow node, use that instead of start node
    let initialNode = startNode;
    const startEdges = flowData.edges.filter(e => e.source === startNode.id);
    
    if (startEdges.length > 0) {
      const firstConnectedNode = flowData.nodes.find(n => n.id === startEdges[0].target);
      
      // Prefer workflow nodes for conversation flow, even if they're empty initially
      if (firstConnectedNode && firstConnectedNode.type === 'workflow') {
        console.log('🎯 Using workflow node as initial conversation node:', firstConnectedNode.id);
        
        const customContent = firstConnectedNode.data.customPrompt?.trim() || firstConnectedNode.data.content?.trim();
        if (customContent) {
          console.log('📝 Custom content found:', customContent.substring(0, 100) + '...');
        } else {
          console.log('📝 Empty workflow node - will use default workflow behavior');
        }
        initialNode = firstConnectedNode;
      }
      // For other node types, only use them if they have content
      else if (firstConnectedNode && 
          (firstConnectedNode.data.customPrompt?.trim() || firstConnectedNode.data.content?.trim())) {
        const content = firstConnectedNode.data.customPrompt?.trim() || firstConnectedNode.data.content?.trim();
        const isDefaultPlaceholder = content?.includes('👋 Click here to add your custom AI assistant prompt');
        
        if (!isDefaultPlaceholder) {
          console.log('🎯 Using connected node as initial conversation node:', firstConnectedNode.id);
          console.log('📝 Custom content found:', content?.substring(0, 100) + '...');
          initialNode = firstConnectedNode;
        }
      }
    }

    console.log('📝 Initial node for conversation:', {
      nodeId: initialNode.id,
      nodeType: initialNode.type,
      hasCustomPrompt: !!initialNode.data.customPrompt
    });

    // Generate initial system prompt and tools for the initial node
    const systemPrompt = this.generateSystemPromptForNode(initialNode);
    const selectedTools = this.generateToolsForNode(initialNode);
    
    // Create call config with Call Stages support using global settings
    const callConfig = {
      systemPrompt: systemPrompt,
      model: ultravoxSettings.model,
      voice: ultravoxSettings.voice,
      temperature: ultravoxSettings.temperature,
      languageHint: ultravoxSettings.languageHint,
      firstSpeaker: ultravoxSettings.firstSpeaker,
      initialOutputMedium: 'MESSAGE_MEDIUM_VOICE',
      maxDuration: ultravoxSettings.maxDuration,
      recordingEnabled: ultravoxSettings.recordingEnabled,
      selectedTools: selectedTools,
      metadata: {
        flowId: `flow_${Date.now()}`,
        startNodeId: startNode.id,
        initialNodeId: initialNode.id,
        nodeType: initialNode.type,
        hasCallStages: 'true',
        // Store flow data in metadata for server-side access
        flowData: JSON.stringify({
          nodes: flowData.nodes,
          edges: flowData.edges
        })
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

      // CRITICAL FIX: Initialize execution context BEFORE registering flow data
      // This ensures the call ID is available when changeStage tool is called
      this.executionContext = {
        flowData,
        currentNodeId: initialNode.id,
        variables: {},
        callStageHistory: [initialNode.id],
        ultravoxCall: call
      };

      // Store call ID explicitly for reliable access
      this.currentCallId = call.callId;

      console.log('📝 Execution context initialized with call ID:', call.callId);
      console.log('🔍 Execution context validation:', {
        hasExecutionContext: !!this.executionContext,
        contextCallId: this.executionContext.ultravoxCall?.callId,
        contextCurrentNode: this.executionContext.currentNodeId,
        callIdMatch: this.executionContext.ultravoxCall?.callId === call.callId,
        serviceInstance: this.instanceId,
        explicitCallId: this.currentCallId
      });

      // Now register flow data with the actual call ID
      console.log('📝 Registering flow data with call ID:', call.callId);
      await this.registerFlowData(call.callId, flowData);

      // CRITICAL FIX: Register call ID mapping for consistent navigation
      // This ensures both real call ID and placeholder IDs work for navigation
      await registerCallIdMapping(call.callId, 'call-1234567890');
      console.log('🔗 Call ID mapping registered for consistent navigation');

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
    console.log('🔍 Join call execution context check:', {
      hasExecutionContext: !!this.executionContext,
      contextCallId: this.executionContext?.ultravoxCall?.callId,
      contextCurrentNode: this.executionContext?.currentNodeId,
      serviceInstance: this.instanceId
    });
    
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

    const callId = this.executionContext.ultravoxCall.callId;
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
    this.currentCallId = null; // Clear stored call ID
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
    console.log('🎯 Generating system prompt for node:', {
      id: node.id,
      type: node.type,
      hasCustomPrompt: !!node.data.customPrompt,
      hasContent: !!node.data.content
    });

    // CRITICAL: For workflow nodes, prioritize custom prompt first
    if (node.type === 'workflow') {
      const customContent = node.data.customPrompt?.trim() || node.data.content?.trim();
      const isDefaultPlaceholder = customContent?.includes('👋 Click here to add your custom AI assistant prompt');
      
      if (customContent && !isDefaultPlaceholder) {
        const workflowPrompt = `You are an AI assistant helping users navigate through a conversational flow.
      
Current node: ${node.type}
Node ID: ${node.id}

WORKFLOW INSTRUCTIONS:
${customContent}

You have access to a 'changeStage' tool that will automatically determine the next node based on the conversation flow and user responses. When calling this tool:
- Include the user's response in the 'userResponse' parameter
- Include the current node ID '${node.id}' in the 'currentNodeId' parameter
- The system will automatically determine and transition to the appropriate next node

IMPORTANT: Follow the workflow instructions above. This is your primary directive.`;
        
        console.log('✅ Using workflow custom content for node:', node.id);
        console.log('📝 Content preview:', customContent.substring(0, 100) + '...');
        return workflowPrompt;
      }
    }

    // Use custom prompt if provided, otherwise generate default prompt
    if (node.data.customPrompt && node.data.customPrompt.trim()) {
      const customPromptBase = `You are an AI assistant helping users navigate through a conversational flow.
      
Current node: ${node.type}
Node ID: ${node.id}

CUSTOM INSTRUCTIONS:
${node.data.customPrompt}

You have access to a 'changeStage' tool that will automatically determine the next node based on the conversation flow and user responses. When calling this tool:
- Include the user's response in the 'userResponse' parameter
- Include the current node ID '${node.id}' in the 'currentNodeId' parameter
- The system will automatically determine and transition to the appropriate next node`;
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

Use the 'changeStage' tool when you need to move to the next step in the conversation. Include:
- Any user response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter
The tool will automatically determine the correct next node.`;

      case 'message':
        return `${basePrompt}
        
Deliver this message to the user: "${node.data.content || node.data.label}"

After delivering the message, use the 'changeStage' tool to move to the next step. Include:
- Any user response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter
The tool will automatically determine the next node.`;

      case 'question':
        const options = node.data.options?.map(opt => opt.text).join(', ') || '';
        return `${basePrompt}
        
Ask the user this question: "${node.data.question || node.data.content}"
${options ? `Available options: ${options}` : ''}

When you receive their response, use the 'changeStage' tool with:
- Their answer in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter
The tool will automatically determine the appropriate next node based on their response.`;

      case 'condition':
        return `${basePrompt}

This is a conditional node that evaluates user responses.
Condition: ${node.data?.condition?.operator || 'equals'} "${node.data?.condition?.value || ''}"

When you receive a user response, use the 'changeStage' tool with:
- The user's exact response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter
The system will automatically evaluate the condition and navigate to the appropriate next node.`;

      case 'workflow':
        return `${basePrompt}

WORKFLOW INSTRUCTIONS:
${node.data?.content || node.data?.customPrompt || 'You are a helpful AI assistant. Greet the user and ask how you can help them today. Listen to their response and use the available transitions to guide the conversation flow.'}

You have access to a 'changeStage' tool that will automatically determine the next node based on the conversation flow and user responses. When calling this tool:
- Include the user's response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter
- The system will automatically determine and transition to the appropriate next node

Use the transitions available in this workflow to guide the conversation appropriately.`;

      case 'cal_check_availability':
        return `${basePrompt}

CALENDAR AVAILABILITY CHECK:
${node.data?.content || 'Check calendar availability and provide available time slots to the user.'}

You have access to a 'checkCalendarAvailability' tool to check available time slots. When users ask about availability:
1. Ask for their preferred date or date range if not provided
2. Use the checkCalendarAvailability tool with the startDate parameter (and optionally endDate)
3. Present the available time slots to the user in a friendly format
4. After showing availability, use the 'changeStage' tool to continue the conversation flow

Cal.com Configuration:
- API Key: ${node.data?.calApiKey ? 'Configured' : 'NOT SET'}
- Event Type ID: ${node.data?.calEventTypeId || 'NOT SET'}
- Timezone: ${node.data?.calTimezone || 'America/Los_Angeles'}

Always ask for confirmation before proceeding to booking.`;

      case 'cal_book_appointment':
        return `${basePrompt}

APPOINTMENT BOOKING:
${node.data?.content || 'Book appointments for users using the calendar integration.'}

You have access to a 'bookAppointment' tool to book appointments. When users want to book:
1. Collect required information: name, email, preferred date/time
2. Confirm the details with the user
3. Use the bookAppointment tool with the collected information
4. Provide confirmation details to the user
5. Use the 'changeStage' tool to continue the conversation flow

Cal.com Configuration:
- API Key: ${node.data?.calApiKey ? 'Configured' : 'NOT SET'}
- Event Type ID: ${node.data?.calEventTypeId || 'NOT SET'}
- Timezone: ${node.data?.calTimezone || 'America/Los_Angeles'}

Always confirm booking details before making the appointment and provide clear confirmation after booking.`;

      default:
        return `${basePrompt}

Process this node and use the 'changeStage' tool to continue the conversation flow. Include:
- Any user response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter
The tool will automatically determine the next node.`;
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
            },
            {
              name: 'currentNodeId',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The current node ID'
              },
              required: false
            },
            {
              name: 'callId',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The current call ID for this conversation'
              },
              required: true
            }
          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flow/simple-navigate`,
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

    // Add Cal.com tools for calendar nodes
    if (node.type === 'cal_check_availability') {
      tools.push({
        temporaryTool: {
          modelToolName: 'checkCalendarAvailability',
          description: 'Check available time slots in the calendar using Cal.com',
          dynamicParameters: [
            {
              name: 'startDate',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'Start date for availability check (YYYY-MM-DD format)'
              },
              required: true
            },
            {
              name: 'endDate',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'End date for availability check (YYYY-MM-DD format)'
              },
              required: false
            },
            {
              name: 'nodeId',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The current node ID'
              },
              required: true
            }
          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/cal/check-availability`,
            httpMethod: 'POST'
          }
        }
      });
    }

    if (node.type === 'cal_book_appointment') {
      tools.push({
        temporaryTool: {
          modelToolName: 'bookAppointment',
          description: 'Book an appointment using Cal.com',
          dynamicParameters: [
            {
              name: 'name',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The name of the person booking the appointment'
              },
              required: true
            },
            {
              name: 'email',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The email address of the person booking the appointment'
              },
              required: true
            },
            {
              name: 'startDateTime',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The start date and time for the appointment (ISO 8601 format)'
              },
              required: true
            },
            {
              name: 'duration',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'number',
                description: 'Duration of the appointment in minutes'
              },
              required: false
            },
            {
              name: 'nodeId',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The current node ID'
              },
              required: true
            },

          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/cal/book-appointment`,
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
      console.log('🚨 changeStage tool called - FIXED VERSION 3.0');
      console.log('🔍 Service instance in tool:', this.instanceId);
      
      const { userResponse, currentNodeId } = parameters as { 
        userResponse?: string;
        currentNodeId?: string;
      };

      console.log('🔄 changeStage tool called with parameters:', { userResponse, currentNodeId });

      // CRITICAL FIX: Get call ID from multiple sources with fallbacks
      let actualCallId: string | null = null;

      // 1. Try explicit stored call ID (most reliable)
      if (this.currentCallId) {
        actualCallId = this.currentCallId;
        console.log('✅ Using stored call ID:', actualCallId);
      }
      // 2. Try execution context
      else if (this.executionContext?.ultravoxCall?.callId) {
        actualCallId = this.executionContext.ultravoxCall.callId;
        console.log('✅ Using execution context call ID:', actualCallId);
      }
      // 3. Last resort: check if execution context exists but show detailed error
      else {
        console.error('❌ No call ID available from any source');
        console.error('❌ Debug state:', {
          hasExecutionContext: !!this.executionContext,
          hasCall: !!this.executionContext?.ultravoxCall,
          contextCallId: this.executionContext?.ultravoxCall?.callId,
          storedCallId: this.currentCallId,
          serviceInstance: this.instanceId
        });
        throw new Error('No call ID available for navigation - check execution context');
      }

      console.log('🎯 Current node from context:', this.executionContext?.currentNodeId);
      console.log('🎯 Current node from parameter:', currentNodeId);

      // Use currentNodeId from parameter or fall back to execution context
      const nodeId = currentNodeId || this.executionContext?.currentNodeId;

      if (!nodeId) {
        console.error('❌ No current node ID available');
        throw new Error('No current node ID available for navigation');
      }

      // Call the server-side navigation endpoint
      try {
        console.log('🚀 Making navigation request with FIXED call ID:', {
          userResponse,
          callId: actualCallId,
          currentNodeId: nodeId
        });

        const response = await fetch('/api/flow/navigate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userResponse, 
            callId: actualCallId,
            currentNodeId: nodeId
          })
        });

        console.log('📡 Navigation response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Navigation failed:', response.status, response.statusText, errorData);
          throw new Error(`Navigation failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const navigationResult = await response.json();
        console.log('✅ Navigation successful:', navigationResult);

        // CRITICAL: Update current node ID and notify UI of stage change
        if (navigationResult.metadata?.nodeId) {
          const newNodeId = navigationResult.metadata.nodeId;
          console.log('🎯 Updating UI to show active node:', newNodeId);
          
          // Update execution context
          if (this.executionContext) {
            this.executionContext.currentNodeId = newNodeId;
            this.executionContext.callStageHistory.push(newNodeId);
          }
          
          // Notify UI of stage change
          if (this.stageChangeCallback) {
            console.log('📡 Calling stage change callback for UI update');
            this.stageChangeCallback(newNodeId);
          } else {
            console.warn('⚠️ No stage change callback registered');
          }
        } else {
          console.warn('⚠️ No nodeId in navigation result metadata');
          console.warn('⚠️ Navigation result structure:', Object.keys(navigationResult));
        }

        return navigationResult.toolResultText || 'Navigation completed successfully';

      } catch (error) {
        console.error('❌ Navigation error:', error);
        throw error;
      }
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

  private async registerFlowData(callId: string, flowData: FlowData): Promise<void> {
    try {
      console.log('📝 Registering flow data with details:', {
        callId,
        nodeCount: flowData.nodes.length,
        edgeCount: flowData.edges.length,
        nodeTypes: flowData.nodes.map(n => n.type).join(', ')
      });

      const requestBody = { callId, flowData };
      console.log('📝 Request body validation:', {
        hasCallId: !!callId,
        hasFlowData: !!flowData,
        hasNodes: !!flowData.nodes,
        hasEdges: !!flowData.edges,
        callIdType: typeof callId,
        flowDataType: typeof flowData
      });

      const response = await fetch('/api/flow/navigate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('⚠️ Failed to register flow data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      } else {
        const responseText = await response.text();
        console.log('✅ Flow data registered successfully for call:', callId);
        console.log('✅ Response:', responseText);
      }
    } catch (error) {
      console.error('⚠️ Error registering flow data:', error);
    }
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

 
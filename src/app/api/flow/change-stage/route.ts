import { NextRequest, NextResponse } from 'next/server';
import { getFlowData, storeFlowData } from '../shared-flow-data';

interface StageChangeRequest {
  userResponse: string;
  currentNodeId: string;
  callId: string;
}

interface UltravoxStageConfig {
  systemPrompt: string;
  model?: string;
  voice?: string;
  temperature?: number;
  languageHint?: string;
  selectedTools?: any[];
  initialMessages?: Array<{
    role: string;
    text: string;
  }>;
  toolResultText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StageChangeRequest = await request.json();
    const { userResponse, currentNodeId, callId } = body;

    console.log('🎭 Change Stage Tool called:', {
      userResponse,
      currentNodeId,
      callId: callId?.substring(0, 8) + '...'
    });

    if (!callId || !currentNodeId) {
      return NextResponse.json({
        toolResultText: 'Missing required parameters: callId and currentNodeId',
        error: 'Missing parameters'
      }, { status: 400 });
    }

    // Get flow data
    let flowData = getFlowData(callId);
    
    if (!flowData) {
      // Try to get from actual call ID if using placeholder
      const placeholderCallId = 'call-1234567890'; // Your test placeholder
      flowData = getFlowData(placeholderCallId);
    }

    // NEW: Fallback to fetch from Ultravox API if not found in memory
    if (!flowData) {
      console.log('🔄 Flow data not found in memory, trying Ultravox API...');
      try {
        const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY || '',
            'Content-Type': 'application/json'
          }
        });
        
        if (callResponse.ok) {
          const callData = await callResponse.json();
          if (callData.metadata?.flowData) {
            flowData = JSON.parse(callData.metadata.flowData);
            // Store using shared storage for future use
            storeFlowData(callId, flowData);
            console.log('✅ Retrieved and cached flow data from Ultravox API');
          }
        } else {
          console.log('⚠️ Could not fetch call data from Ultravox API:', callResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching flow data from Ultravox API:', error);
      }
    }

    if (!flowData) {
      console.error('❌ No flow data found for call:', callId);
      return NextResponse.json({
        toolResultText: 'Flow data not found. Please ensure the call is properly initialized with flow metadata.',
        error: 'No flow data'
      }, { status: 404 });
    }

    // Determine next node based on current node and user response
    const nextNodeId = determineNextNode(flowData, currentNodeId, userResponse);
    
    if (!nextNodeId) {
      console.log('🏁 End of flow reached');
      return NextResponse.json({
        toolResultText: 'Thank you! That completes our conversation. Have a great day!',
        systemPrompt: generateEndOfFlowPrompt()
      });
    }

    // Get next node details
    const nextNode = flowData.nodes.find((n: any) => n.id === nextNodeId);
    if (!nextNode) {
      console.error('❌ Next node not found:', nextNodeId);
      return NextResponse.json({
        toolResultText: 'Navigation error: target node not found',
        error: 'Node not found'
      }, { status: 404 });
    }

    // Generate new stage configuration
    const stageConfig = generateUltravoxStageConfig(nextNode, userResponse, callId, flowData);
    
    console.log('✅ Generated new stage config:', {
      from: currentNodeId,
      to: nextNodeId,
      nodeType: nextNode.type,
      hasCustomPrompt: !!nextNode.data?.customPrompt
    });

    // Return response with proper Ultravox Call Stages headers
    const response = NextResponse.json(stageConfig);
    response.headers.set('X-Ultravox-Response-Type', 'new-stage');
    response.headers.set('Content-Type', 'application/json');
    
    return response;

  } catch (error) {
    console.error('❌ Error in change stage tool:', error);
    return NextResponse.json({
      toolResultText: 'I encountered an error while processing your request. Let me try to help you another way.',
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function determineNextNode(flowData: any, currentNodeId: string, userResponse?: string): string | null {
  console.log('🔍 Determining next node from:', currentNodeId, 'with response:', userResponse);

  const currentNode = flowData.nodes.find((n: any) => n.id === currentNodeId);
  if (!currentNode) {
    console.error('❌ Current node not found:', currentNodeId);
    return null;
  }

  // Enhanced debugging: Show current node details
  console.log('📋 Current node details:', {
    id: currentNode.id,
    type: currentNode.type,
    title: currentNode.data?.nodeTitle,
    hasTransitions: !!currentNode.data?.transitions,
    transitionsCount: currentNode.data?.transitions?.length || 0,
    transitions: currentNode.data?.transitions?.map((t: any) => t.label) || []
  });

  // Find outgoing edges from current node
  const outgoingEdges = flowData.edges.filter((edge: any) => edge.source === currentNodeId);
  console.log('🔗 Found', outgoingEdges.length, 'outgoing edges');
  
  // Enhanced debugging: Show edge details
  if (outgoingEdges.length > 0) {
    console.log('🔗 Edge details:', outgoingEdges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label
    })));
  }

  // Enhanced debugging: Show all nodes in flow for reference
  console.log('📊 All nodes in flow:', flowData.nodes.map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.data?.nodeTitle,
    hasCustomPrompt: !!n.data?.customPrompt
  })));

  // Enhanced debugging: Show all edges in flow for reference  
  console.log('📊 All edges in flow:', flowData.edges.map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target
  })));

  if (outgoingEdges.length === 0) {
    console.log('🏁 No outgoing edges found - end of flow');
    console.log('💡 SOLUTION: In your flow editor, you need to:');
    console.log('   1. Create target nodes for each transition in this node');
    console.log('   2. Draw edges connecting this node to the target nodes');
    console.log('   3. Save the flow to update the flow data');
    return null;
  }

  // Enhanced logic for workflow nodes with transitions
  if (currentNode.type === 'workflow' && currentNode.data?.transitions && userResponse) {
    const responseText = userResponse.toLowerCase().trim();
    
    console.log('🎯 Attempting to match user response to transitions...');
    
    // Match user response to transitions with improved logic
    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const transition = currentNode.data.transitions[i];
      
      if (transition?.label) {
        const transitionLabel = transition.label.toLowerCase();
        
        console.log(`🔍 Checking transition ${i}: "${transition.label}" vs response: "${userResponse}"`);
        
        // Enhanced matching logic
        if (isResponseMatch(responseText, transitionLabel)) {
          console.log('✅ Matched response to transition:', transition.label);
          return edge.target;
        }
      }
    }
    
    // If no specific match, try first edge
    console.log('⚠️ No specific match found, using first edge');
    return outgoingEdges[0]?.target || null;
  }

  // Enhanced logic for Cal nodes with transitions
  if ((currentNode.type === 'cal_check_availability' || currentNode.type === 'cal_book_appointment') && currentNode.data?.transitions && userResponse) {
    const responseText = userResponse.toLowerCase().trim();
    
    console.log('📅 Attempting to match user response to Cal node transitions...');
    
    // Match user response to transitions with improved logic
    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const transition = currentNode.data.transitions[i];
      
      if (transition?.label) {
        const transitionLabel = transition.label.toLowerCase();
        
        console.log(`🔍 Checking Cal transition ${i}: "${transition.label}" vs response: "${userResponse}"`);
        
        // Enhanced matching logic for Cal nodes
        if (isCalResponseMatch(responseText, transitionLabel, currentNode.type)) {
          console.log('✅ Matched response to Cal transition:', transition.label);
          return edge.target;
        }
      }
    }
    
    // If no specific match, try first edge
    console.log('⚠️ No specific match found for Cal node, using first edge');
    return outgoingEdges[0]?.target || null;
  }

  // For other node types, use first edge
  console.log('➡️ Using first outgoing edge for node type:', currentNode.type);
  return outgoingEdges[0]?.target || null;
}

function isResponseMatch(userResponse: string, transitionLabel: string): boolean {
  // Positive responses
  if ((userResponse.includes('yes') || userResponse.includes('want') || userResponse.includes('interested') || userResponse.includes('learn')) &&
      (transitionLabel.includes('yes') || transitionLabel.includes('want') || transitionLabel.includes('learn'))) {
    return true;
  }
  
  // Negative responses
  if ((userResponse.includes('no') || userResponse.includes('not') || userResponse.includes('busy')) &&
      (transitionLabel.includes('no') || transitionLabel.includes('busy') || transitionLabel.includes('not'))) {
    return true;
  }
  
  // Medical/surgery related
  if ((userResponse.includes('surgery') || userResponse.includes('operation') || userResponse.includes('medical')) &&
      (transitionLabel.includes('surgery') || transitionLabel.includes('medical'))) {
    return true;
  }
  
  // Transfer/agent requests
  if ((userResponse.includes('agent') || userResponse.includes('human') || userResponse.includes('transfer')) &&
      (transitionLabel.includes('agent') || transitionLabel.includes('transfer'))) {
    return true;
  }
  
  // Reschedule requests
  if ((userResponse.includes('reschedule') || userResponse.includes('change') || userResponse.includes('appointment')) &&
      (transitionLabel.includes('reschedule') || transitionLabel.includes('appointment'))) {
    return true;
  }
  
  return false;
}

function isCalResponseMatch(userResponse: string, transitionLabel: string, nodeType: string): boolean {
  if (nodeType === 'cal_check_availability') {
    // Check availability node transitions
    if ((userResponse.includes('book') || userResponse.includes('schedule') || userResponse.includes('yes') || userResponse.includes('confirm') || userResponse.includes('perfect')) &&
        (transitionLabel.includes('book') || transitionLabel.includes('schedule') || transitionLabel.includes('appointment'))) {
      return true;
    }
    if ((userResponse.includes('later') || userResponse.includes('no') || userResponse.includes('not now') || userResponse.includes('different time')) &&
        (transitionLabel.includes('later') || transitionLabel.includes('no') || transitionLabel.includes('different'))) {
      return true;
    }
  }
  
  if (nodeType === 'cal_book_appointment') {
    // Book appointment node transitions
    if ((userResponse.includes('confirm') || userResponse.includes('yes') || userResponse.includes('book') || userResponse.includes('proceed')) &&
        (transitionLabel.includes('confirm') || transitionLabel.includes('book') || transitionLabel.includes('proceed'))) {
      return true;
    }
    if ((userResponse.includes('cancel') || userResponse.includes('no') || userResponse.includes('not') || userResponse.includes('different')) &&
        (transitionLabel.includes('cancel') || transitionLabel.includes('no') || transitionLabel.includes('different'))) {
      return true;
    }
  }
  
  // Fallback to general matching
  return isResponseMatch(userResponse, transitionLabel);
}

function generateUltravoxStageConfig(node: any, userResponse: string, callId: string, flowData: any): UltravoxStageConfig {
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
  console.log('⚙️ Using stage Ultravox settings:', ultravoxSettings);

  const baseConfig: UltravoxStageConfig = {
    systemPrompt: generateSystemPrompt(node, userResponse, callId),
    model: ultravoxSettings.model,
    voice: ultravoxSettings.voice,
    temperature: ultravoxSettings.temperature,
    languageHint: ultravoxSettings.languageHint,
    selectedTools: generateStageTools(callId),
    toolResultText: `Successfully transitioned to ${node.data?.nodeTitle || node.type} stage.`
  };

  // Add initial messages if needed
  if (userResponse) {
    baseConfig.initialMessages = [
      {
        role: 'MESSAGE_ROLE_USER',
        text: userResponse
      }
    ];
  }

  return baseConfig;
}

function generateSystemPrompt(node: any, userResponse: string, callId: string): string {
  const basePrompt = `You are an AI assistant helping users navigate through a conversational flow.
      
Current node: ${node.type}
Node ID: ${node.id}

WORKFLOW INSTRUCTIONS:
${node.data?.customPrompt || node.data?.content || 'Continue the conversation naturally.'}

You have access to a 'changeStage' tool that will automatically determine the next node based on the conversation flow and user responses. When calling this tool:
- Include the user's response in the 'userResponse' parameter
- Include the current node ID '${node.id}' in the 'currentNodeId' parameter
- CRITICAL: Include the call ID '${callId}' in the 'callId' parameter
- The system will automatically determine and transition to the appropriate next node

IMPORTANT: Follow the workflow instructions above. This is your primary directive.`;

  return basePrompt;
}

function generateStageTools(callId: string): any[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://62be-2400-adc3-11b-2700-2818-6b4-f640-d87d.ngrok-free.app';
  
  return [
    {
      temporaryTool: {
        modelToolName: 'changeStage',
        description: 'Navigate to the next stage in the conversation flow based on user responses and current node transitions.',
        dynamicParameters: [
          {
            name: 'userResponse',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'The user\'s response or input that triggered the stage change'
            },
            required: true
          },
          {
            name: 'currentNodeId',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'The ID of the current node in the flow'
            },
            required: true
          },
          {
            name: 'callId',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'The unique identifier for this call session'
            },
            required: true
          }
        ],
        http: {
          baseUrlPattern: `${baseUrl}/api/flow/change-stage`,
          httpMethod: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        }
      }
    }
  ];
}

function generateEndOfFlowPrompt(): string {
  return `You have reached the end of the conversation flow. 

Thank the user for their time and let them know the conversation is complete. You may answer any final questions they have, but you no longer have access to the changeStage tool as the flow has concluded.

Be helpful and polite in your closing remarks.`;
} 
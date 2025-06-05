import { NextRequest, NextResponse } from 'next/server';
import { FlowData, FlowNode } from '../../../types';
import { storeFlowData, getFlowData, getActiveFlowsCount } from '../shared-flow-data';

// In-memory storage for active flow data (in production, this would be in a database)
interface NavigateRequest {
  userResponse?: string;
  callId?: string;
  currentNodeId?: string;
  flowData?: FlowData;
}

interface ToolConfig {
  temporaryTool: {
    modelToolName: string;
    description: string;
    dynamicParameters: Array<{
      name: string;
      location: string;
      schema: {
        type: string;
        description: string;
        enum?: string[];
      };
      required: boolean;
    }>;
    http: {
      baseUrlPattern: string;
      httpMethod: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    console.log('🔄 Navigate tool called with call stages:', requestData);

    const { userResponse, currentNodeId, callId } = requestData;

    // CRITICAL FIX: Extract call ID from multiple sources
    let actualCallId = callId;

    // If client didn't provide call ID, try to extract from UltraVox headers
    if (!actualCallId || actualCallId === 'undefined' || actualCallId === 'new call' || actualCallId === 'new_call') {
      // Try to get call ID from UltraVox request headers
      const ultravoxCallId = request.headers.get('x-ultravox-call-id') || 
                            request.headers.get('ultravox-call-id') ||
                            request.headers.get('call-id');
      
      if (ultravoxCallId) {
        actualCallId = ultravoxCallId;
        console.log('✅ Extracted call ID from headers:', actualCallId);
      } else {
        // Last resort: try to find the most recent call in our flow data
        console.log('🔍 No call ID from client or headers, checking active flows...');
        const activeFlowsCount = getActiveFlowsCount();
        if (activeFlowsCount === 1) {
          // Would need to implement a function to get all keys from shared storage
          // For now, let's handle this case differently
          console.log('✅ Single active flow available');
        } else {
          console.error('❌ Cannot determine call ID. Active flows count:', activeFlowsCount);
          return NextResponse.json(
            { 
              error: 'Cannot determine call ID for navigation',
              toolResultText: 'I cannot navigate the flow without a valid call ID.'
            },
            { status: 400 }
          );
        }
      }
    }

    console.log('🎯 Using call ID for navigation:', actualCallId);

    // If no currentNodeId provided, we can't determine next step
    if (!currentNodeId) {
      console.error('❌ No currentNodeId provided in navigate request');
      return NextResponse.json({
        success: false,
        message: 'Current node ID is required for navigation',
        userResponse
      });
    }

    // Try to get flow data from shared storage
    let activeFlowData = actualCallId ? getFlowData(actualCallId) : null;
    
    if (!activeFlowData) {
      console.warn('⚠️ No flow data found in shared storage for call:', actualCallId);
      
      // Try to get flow data from UltraVox call metadata
      if (actualCallId) {
        try {
          console.log('🔍 Attempting to retrieve flow data from call metadata...');
          const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${actualCallId}`, {
            headers: {
              'X-API-Key': process.env.ULTRAVOX_API_KEY || '',
              'Content-Type': 'application/json'
            }
          });
          
          if (callResponse.ok) {
            const callData = await callResponse.json();
            console.log('📞 Retrieved call data:', { 
              callId: callData.callId, 
              hasMetadata: !!callData.metadata,
              hasFlowData: !!callData.metadata?.flowData 
            });
            
            if (callData.metadata?.flowData) {
              activeFlowData = JSON.parse(callData.metadata.flowData);
              console.log('✅ Successfully parsed flow data from metadata');
              console.log('📊 Flow structure:', {
                nodeCount: activeFlowData?.nodes?.length || 0,
                workflowNodes: activeFlowData?.nodes?.filter(n => n.type === 'workflow').length || 0,
                workflowNodesWithCustomPrompts: activeFlowData?.nodes?.filter(n => 
                  n.type === 'workflow' && n.data.customPrompt
                ).length || 0
              });
              
              // Store in shared storage for future use
              if (actualCallId && activeFlowData) {
                storeFlowData(actualCallId, activeFlowData);
              }
            }
          } else {
            console.warn('⚠️ Failed to retrieve call data:', callResponse.status, callResponse.statusText);
          }
        } catch (error) {
          console.warn('⚠️ Error retrieving call metadata:', error);
        }
      }
      
      // If still no flow data, return basic response
      if (!activeFlowData) {
        console.log('⚠️ No flow data available, returning basic transition response');
        return NextResponse.json({
          systemPrompt: `Continue the conversation naturally. You are currently at node ${currentNodeId}.`,
          voice: 'Mark',
          temperature: 0.4,
          selectedTools: generateBasicTools(),
          metadata: {
            nodeId: currentNodeId,
            nodeType: 'generic',
            previousUserResponse: userResponse
          },
          toolResultText: `Processed response from node ${currentNodeId}. Continue conversation naturally.`
        }, { 
          headers: { 'X-Ultravox-Response-Type': 'new-stage' }
        });
      }
    }

    // Ensure we have flow data at this point
    if (!activeFlowData) {
      console.error('❌ No flow data available after all attempts');
      return NextResponse.json({
        success: false,
        message: 'No flow data available'
      });
    }

    // At this point, TypeScript knows activeFlowData is not null
    const flowData = activeFlowData as FlowData;

    // Find current node
    const currentNode = flowData.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      console.error('❌ Current node not found in flow:', currentNodeId);
      return NextResponse.json({
        success: false,
        message: `Current node ${currentNodeId} not found in flow`
      });
    }

    console.log('📍 Current node details:', {
      id: currentNode.id,
      type: currentNode.type,
      hasCustomPrompt: !!currentNode.data.customPrompt,
      customPrompt: currentNode.data.customPrompt?.substring(0, 50) + '...'
    });

    // Determine next node based on flow logic
    const nextNodeId = determineNextNode(flowData, currentNodeId, userResponse);
    
    if (!nextNodeId) {
      console.log('🏁 No next node found - conversation may be ending');
      return NextResponse.json({
        systemPrompt: generateEndingPrompt(currentNode, userResponse),
        voice: 'Mark',
        temperature: 0.4,
        selectedTools: [],
        metadata: {
          nodeId: currentNodeId,
          nodeType: 'ending',
          previousUserResponse: userResponse
        },
        toolResultText: 'Conversation is ending. Provide a friendly closing.'
      }, { 
        headers: { 'X-Ultravox-Response-Type': 'new-stage' }
      });
    }

    // Get target node
    const targetNode = flowData.nodes.find(n => n.id === nextNodeId);
    if (!targetNode) {
      console.error('❌ Target node not found:', nextNodeId);
      return NextResponse.json({
        success: false,
        message: `Target node ${nextNodeId} not found`
      });
    }

    console.log(`🎯 Transitioning from ${currentNodeId} (${currentNode.type}) to ${nextNodeId} (${targetNode.type})`);
    console.log('📍 Target node details:', {
      id: targetNode.id,
      type: targetNode.type,
      hasCustomPrompt: !!targetNode.data.customPrompt,
      customPrompt: targetNode.data.customPrompt?.substring(0, 50) + '...'
    });

    // Generate stage configuration for target node
    const newStageConfig = {
      systemPrompt: generateStagePrompt(targetNode, userResponse),
      voice: 'Mark',
      temperature: 0.4,
              selectedTools: generateStageTools(targetNode),
      metadata: {
        nodeId: targetNode.id,
        nodeType: targetNode.type,
        previousUserResponse: userResponse,
        previousNodeId: currentNodeId
      },
      toolResultText: generateTransitionMessage(currentNode, targetNode, userResponse)
    };

    console.log('📋 Generated stage config:', {
      fromNode: currentNodeId,
      toNode: targetNode.id,
      nodeType: targetNode.type,
      hasCustomPrompt: !!targetNode.data?.customPrompt,
      promptLength: newStageConfig.systemPrompt.length
    });

    // Return the new stage configuration with proper header
    const response = NextResponse.json(newStageConfig, { status: 200 });
    response.headers.set('X-Ultravox-Response-Type', 'new-stage');
    
    return response;

  } catch (error) {
    console.error('❌ Server error in flow navigation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function determineNextNode(flowData: FlowData, currentNodeId: string, userResponse?: string): string | null {
  console.log('🔍 Determining next node from:', currentNodeId, 'with response:', userResponse);

  const currentNode = flowData.nodes.find(n => n.id === currentNodeId);
  if (!currentNode) {
    console.error('❌ Current node not found:', currentNodeId);
    return null;
  }

  // Find outgoing edges from current node
  const outgoingEdges = flowData.edges.filter(edge => edge.source === currentNodeId);
  console.log('🔗 Found', outgoingEdges.length, 'outgoing edges');

  if (outgoingEdges.length === 0) {
    console.log('🏁 No outgoing edges found - end of flow');
    return null;
  }

  // Handle different node types with enhanced logic
  switch (currentNode.type) {
    case 'start':
    case 'message':
      // For start and message nodes, use smart routing if multiple paths available
      if (userResponse && outgoingEdges.length > 1) {
        const responseText = userResponse.toLowerCase().trim();
        
        for (const edge of outgoingEdges) {
          const targetNode = flowData.nodes.find(n => n.id === edge.target);
          if (targetNode) {
            const nodeId = targetNode.id.toLowerCase();
            const nodeTitle = targetNode.data?.nodeTitle?.toLowerCase() || '';
            const nodeContent = targetNode.data?.content?.toLowerCase() || '';
            
            // Check for keyword matches in response
            if ((responseText.includes('free') || responseText.includes('yes') || responseText.includes('available') || responseText.includes('time')) && 
                (nodeId.includes('free') || nodeTitle.includes('free') || nodeContent.includes('free'))) {
              console.log('✅ Matched "free/available" response to node:', targetNode.id);
              return edge.target;
            }
            if ((responseText.includes('busy') || responseText.includes('no') || responseText.includes('not available') || responseText.includes('later')) && 
                (nodeId.includes('busy') || nodeTitle.includes('busy') || nodeContent.includes('busy'))) {
              console.log('✅ Matched "busy" response to node:', targetNode.id);
              return edge.target;
            }
          }
        }
      }
      // Fallback to first connected node
      const nextEdge = outgoingEdges[0];
      console.log('➡️ Moving to next node:', nextEdge?.target);
      return nextEdge?.target || null;

    case 'question':
      // For question nodes, try to match user response to options
      if (currentNode.data?.options && userResponse && outgoingEdges.length > 1) {
        // Simple response matching - in production, use better NLP
        const responseText = userResponse.toLowerCase().trim();
        
        // Try to match response to edge labels or node content
        for (let i = 0; i < outgoingEdges.length; i++) {
          const edge = outgoingEdges[i];
          const targetNode = flowData.nodes.find(n => n.id === edge.target);
          
          if (targetNode) {
            // Check if response matches any keywords for this path
            const nodeLabel = targetNode.data?.label?.toLowerCase() || '';
            const nodeContent = targetNode.data?.content?.toLowerCase() || '';
            
            if (responseText.includes('free') && (nodeLabel.includes('free') || nodeContent.includes('free'))) {
              console.log('✅ Matched "free" response to node:', targetNode.id);
              return edge.target;
            }
            if (responseText.includes('busy') && (nodeLabel.includes('busy') || nodeContent.includes('busy'))) {
              console.log('✅ Matched "busy" response to node:', targetNode.id);
              return edge.target;
            }
            if (responseText.includes('yes') && (nodeLabel.includes('yes') || i === 0)) {
              console.log('✅ Matched "yes" response to first option:', targetNode.id);
              return edge.target;
            }
            if (responseText.includes('no') && (nodeLabel.includes('no') || i === 1)) {
              console.log('✅ Matched "no" response to second option:', targetNode.id);
              return edge.target;
            }
          }
        }
      }
      // Fallback to first edge
      console.log('⚠️ No specific match found, using first edge');
      return outgoingEdges[0]?.target || null;

    case 'condition':
      // For condition nodes, evaluate the condition
      if (currentNode.data?.condition && userResponse) {
        const condition = currentNode.data.condition;
        let conditionMet = false;

        switch (condition.operator) {
          case 'equals':
            conditionMet = userResponse.toLowerCase().trim() === condition.value.toLowerCase().trim();
            break;
          case 'contains':
            conditionMet = userResponse.toLowerCase().includes(condition.value.toLowerCase());
            break;
        }

        console.log('🔍 Condition evaluation:', {
          userResponse,
          condition: condition.value,
          operator: condition.operator,
          result: conditionMet
        });

        // Use first edge for true, second for false (or first if only one)
        const targetEdge = outgoingEdges[conditionMet ? 0 : Math.min(1, outgoingEdges.length - 1)];
        return targetEdge?.target || null;
      }
      return outgoingEdges[0]?.target || null;

    case 'workflow':
      // For workflow nodes, try to match user response to defined transitions
      if (currentNode.data?.transitions && userResponse && outgoingEdges.length > 1) {
        const responseText = userResponse.toLowerCase().trim();
        
        // Try to match response to transition labels
        for (let i = 0; i < outgoingEdges.length; i++) {
          const edge = outgoingEdges[i];
          const transition = currentNode.data.transitions[i];
          
          if (transition?.label) {
            const transitionLabel = transition.label.toLowerCase();
            
            // Check for specific workflow transition matches
            if (responseText.includes('free') && transitionLabel.includes('free')) {
              console.log('✅ Matched "free" response to transition:', transition.label);
              return edge.target;
            }
            if (responseText.includes('busy') && transitionLabel.includes('busy')) {
              console.log('✅ Matched "busy" response to transition:', transition.label);
              return edge.target;
            }
            if (responseText.includes('yes') && (transitionLabel.includes('yes') || i === 0)) {
              console.log('✅ Matched "yes" response to transition:', transition.label);
              return edge.target;
            }
            if (responseText.includes('no') && (transitionLabel.includes('no') || i === 1)) {
              console.log('✅ Matched "no" response to transition:', transition.label);
              return edge.target;
            }
          }
        }
      }
      
      // If no explicit transitions, try to match user response to target node content/IDs
      if (userResponse && outgoingEdges.length > 1) {
        const responseText = userResponse.toLowerCase().trim();
        
        for (const edge of outgoingEdges) {
          const targetNode = flowData.nodes.find(n => n.id === edge.target);
          if (targetNode) {
            const nodeId = targetNode.id.toLowerCase();
            const nodeTitle = targetNode.data?.nodeTitle?.toLowerCase() || '';
            const nodeContent = targetNode.data?.content?.toLowerCase() || '';
            
            // Check for keyword matches in response
            if ((responseText.includes('free') || responseText.includes('yes') || responseText.includes('available') || responseText.includes('time')) && 
                (nodeId.includes('free') || nodeTitle.includes('free') || nodeContent.includes('free'))) {
              console.log('✅ Matched "free/available" response to node:', targetNode.id);
              return edge.target;
            }
            if ((responseText.includes('busy') || responseText.includes('no') || responseText.includes('not available') || responseText.includes('later')) && 
                (nodeId.includes('busy') || nodeTitle.includes('busy') || nodeContent.includes('busy'))) {
              console.log('✅ Matched "busy" response to node:', targetNode.id);
              return edge.target;
            }
          }
        }
      }
      
      // For workflow nodes, proceed to next step
      console.log('⚙️ Processing workflow node, moving to next step');
      return outgoingEdges[0]?.target || null;

    case 'cal_check_availability':
      // For calendar availability check nodes, proceed to next step after showing availability
      console.log('📅 Processing calendar availability check node');
      return outgoingEdges[0]?.target || null;

    case 'cal_book_appointment':
      // For appointment booking nodes, proceed to next step after booking
      console.log('📅 Processing appointment booking node');
      return outgoingEdges[0]?.target || null;

    default:
      // For other node types, use first edge
      console.log('🔄 Generic node transition');
      return outgoingEdges[0]?.target || null;
  }
}

function generateStagePrompt(node: FlowNode, userResponse?: string): string {
  const basePrompt = `You are an AI assistant helping users navigate through a conversational flow.

Current node: ${node.type}
Node ID: ${node.id}
${userResponse ? `User's last response: "${userResponse}"` : ''}
`;

  // Use custom prompt if provided
  if (node.data?.customPrompt?.trim()) {
    return `${basePrompt}

CUSTOM INSTRUCTIONS:
${node.data.customPrompt}

Use the 'changeStage' tool when you need to move to the next step in the conversation. Include:
- The user's response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter`;
  }

  // Generate prompts based on node type
  switch (node.type) {
    case 'start':
      return `${basePrompt}

You are starting a new conversation. ${node.data?.content || 'Welcome! How can I help you today?'}

Use the 'changeStage' tool when ready to move to the next step.`;

    case 'message':
      return `${basePrompt}

Deliver this message to the user: "${node.data?.content || node.data?.label || 'Message not configured'}"

After delivering the message, use the 'changeStage' tool to continue.`;

    case 'question':
      return `${basePrompt}

Ask the user this question: "${node.data?.question || node.data?.content || 'Question not configured'}"

When you receive their response, use the 'changeStage' tool to proceed based on their answer.`;

    case 'condition':
      return `${basePrompt}

This is a conditional node. Evaluate the user's response and use the 'changeStage' tool to proceed.
Condition: ${node.data?.condition?.operator || 'equals'} "${node.data?.condition?.value || ''}"`;

    case 'workflow':
      // For workflow nodes, prioritize custom prompt or use content
      const workflowContent = node.data?.customPrompt?.trim() || node.data?.content?.trim();
      const isDefaultPlaceholder = workflowContent?.includes('👋 Click here to add your custom AI assistant prompt');
      
      if (workflowContent && !isDefaultPlaceholder) {
        return `${basePrompt}

WORKFLOW INSTRUCTIONS:
${workflowContent}

Use the 'changeStage' tool when ready to continue to the next step. Include:
- The user's response in the 'userResponse' parameter
- The current node ID '${node.id}' in the 'currentNodeId' parameter`;
      } else {
        return `${basePrompt}

WORKFLOW CONTENT:
${node.data?.content || node.data?.label || 'Process this workflow step.'}

Use the 'changeStage' tool when ready to continue to the next step.`;
      }

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

Process this ${node.type} node and use the 'changeStage' tool to continue the conversation flow.`;
  }
}

function generateStageTools(node?: FlowNode): ToolConfig[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const tools: ToolConfig[] = [
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
              description: 'The current call ID'
            },
            required: false
          }
        ],
        http: {
          baseUrlPattern: `${baseUrl}/api/flow/navigate`,
          httpMethod: 'POST'
        }
      }
    }
  ];

  // Add Cal.com tools based on node type
  if (node?.type === 'cal_check_availability') {
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
          baseUrlPattern: `${baseUrl}/api/cal/check-availability`,
          httpMethod: 'POST'
        }
      }
    });
  }

  if (node?.type === 'cal_book_appointment') {
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
              type: 'string',
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
          }
        ],
        http: {
          baseUrlPattern: `${baseUrl}/api/cal/book-appointment`,
          httpMethod: 'POST'
        }
      }
    });
  }

  return tools;
}

function generateTransitionMessage(fromNode: FlowNode, toNode: FlowNode, userResponse?: string): string {
  // Instead of a system message, speak naturally based on the target node's content
  if (toNode.data?.content) {
    return toNode.data.content;
  } else if (toNode.data?.label) {
    return toNode.data.label;
  } else {
    // Fallback to a natural greeting based on node type
    switch (toNode.type) {
      case 'workflow':
        return `I understand. Let me help you with that.`;
      case 'question':
        return `I have a question for you.`;
      case 'message':
        return `Thank you for that information.`;
      default:
        return `Let me assist you further.`;
    }
  }
}

function generateEndingPrompt(node: FlowNode, userResponse?: string): string {
  return `You are ending the conversation flow.

Previous node: ${node.type}
${userResponse ? `User's last response: "${userResponse}"` : ''}

Provide a friendly closing message and thank the user for their time.`;
}

// API to register flow data for a call
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 PUT /api/flow/navigate called');
    
    // Check content type
    const contentType = request.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    
    if (!contentType?.includes('application/json')) {
      console.error('❌ Invalid content type:', contentType);
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('📝 PUT /api/flow/navigate received data:', {
      hasCallId: !!requestData.callId,
      hasFlowData: !!requestData.flowData,
      callId: requestData.callId,
      callIdType: typeof requestData.callId,
      flowDataType: typeof requestData.flowData,
      flowDataKeys: requestData.flowData ? Object.keys(requestData.flowData) : 'no flowData',
      requestKeys: Object.keys(requestData)
    });

    const { callId, flowData } = requestData;
    
    // More forgiving validation
    if (!callId) {
      console.error('❌ PUT validation failed - missing callId:', {
        callId: callId,
        callIdType: typeof callId
      });
      return NextResponse.json(
        { error: 'callId is required', received: { callId } },
        { status: 400 }
      );
    }

    if (!flowData) {
      console.error('❌ PUT validation failed - missing flowData:', {
        hasFlowData: !!flowData,
        flowDataType: typeof flowData
      });
      return NextResponse.json(
        { error: 'flowData is required', received: { hasFlowData: !!flowData } },
        { status: 400 }
      );
    }

    // Additional flowData validation
    if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
      console.error('❌ PUT validation failed - invalid flowData.nodes:', {
        hasNodes: !!flowData.nodes,
        nodesType: typeof flowData.nodes,
        isArray: Array.isArray(flowData.nodes)
      });
      return NextResponse.json(
        { error: 'flowData must have nodes array', received: { hasNodes: !!flowData.nodes } },
        { status: 400 }
      );
    }

    if (!flowData.edges || !Array.isArray(flowData.edges)) {
      console.error('❌ PUT validation failed - invalid flowData.edges:', {
        hasEdges: !!flowData.edges,
        edgesType: typeof flowData.edges,
        isArray: Array.isArray(flowData.edges)
      });
      return NextResponse.json(
        { error: 'flowData must have edges array', received: { hasEdges: !!flowData.edges } },
        { status: 400 }
      );
    }

    // Store the flow data using shared storage
    storeFlowData(callId, flowData);
    
    console.log('✅ Successfully registered flow data for call:', callId);
    console.log('📊 Active flows count:', getActiveFlowsCount());
    console.log('📊 Flow data stats:', {
      nodeCount: flowData.nodes.length,
      edgeCount: flowData.edges.length,
      nodeTypes: flowData.nodes.map((n: FlowNode) => n.type).join(', ')
    });
    
    return NextResponse.json({ success: true, callId, nodeCount: flowData.nodes.length });
  } catch (error) {
    console.error('❌ Error in PUT /api/flow/navigate:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for debugging call IDs and flow data status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    
    if (callId) {
      // Return flow data status for specific call ID
      const flowData = getFlowData(callId);
      return NextResponse.json({
        callId,
        hasFlowData: !!flowData,
        nodeCount: flowData?.nodes?.length || 0,
        edgeCount: flowData?.edges?.length || 0,
        flowData: flowData ? { 
          nodes: flowData.nodes.map((n: FlowNode) => ({ id: n.id, type: n.type })),
          edgeCount: flowData.edges.length 
        } : null
      });
    } else {
      // Return overall status
      const activeFlowsCount = getActiveFlowsCount();
      return NextResponse.json({
        status: 'Flow navigation API operational',
        activeFlowsCount,
        timestamp: new Date().toISOString(),
        availableEndpoints: {
          POST: 'Navigate between flow nodes',
          PUT: 'Register flow data for a call',
          GET: 'Get flow data status (add ?callId=xxx for specific call)'
        }
      });
    }
  } catch (error) {
    console.error('❌ Error in GET /api/flow/navigate:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

function generateBasicTools(): ToolConfig[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  return [
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
          }
        ],
        http: {
          baseUrlPattern: `${baseUrl}/api/flow/navigate`,
          httpMethod: 'POST'
        }
      }
    }
  ];
} 
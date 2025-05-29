import { NextRequest, NextResponse } from 'next/server';
import { FlowData, FlowNode } from '../../../../types';

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

// In-memory store for active flows (in production, use Redis or DB)
const activeFlows: Map<string, FlowData> = new Map();

export async function POST(request: NextRequest) {
  try {
    const { userResponse, callId, currentNodeId }: NavigateRequest = await request.json();

    console.log('🔄 Navigate tool called with call stages:', { 
      userResponse, 
      callId, 
      currentNodeId
    });

    // If no currentNodeId provided, we can't determine next step
    if (!currentNodeId) {
      console.error('❌ No currentNodeId provided in navigate request');
      return NextResponse.json({
        success: false,
        message: 'Current node ID is required for navigation',
        userResponse
      });
    }

    // Try to get flow data from memory (this would be from call metadata in production)
    let activeFlowData = callId ? activeFlows.get(callId) : null;
    
    if (!activeFlowData) {
      console.warn('⚠️ No flow data found in memory for call:', callId);
      
      // Try to get flow data from UltraVox call metadata
      if (callId) {
        try {
          console.log('🔍 Attempting to retrieve flow data from call metadata...');
          const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
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
              
              // Store in memory for future use
              activeFlows.set(callId, activeFlowData);
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

    // Find current node
    const currentNode = activeFlowData.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      console.error('❌ Current node not found in flow:', currentNodeId);
      return NextResponse.json({
        success: false,
        message: `Current node ${currentNodeId} not found in flow`
      });
    }

    // Determine next node based on flow logic
    const nextNodeId = determineNextNode(activeFlowData!, currentNodeId, userResponse);
    
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
    const targetNode = activeFlowData.nodes.find(n => n.id === nextNodeId);
    if (!targetNode) {
      console.error('❌ Target node not found:', nextNodeId);
      return NextResponse.json({
        success: false,
        message: `Target node ${nextNodeId} not found`
      });
    }

    console.log(`🎯 Transitioning from ${currentNodeId} (${currentNode.type}) to ${nextNodeId} (${targetNode.type})`);

    // Generate stage configuration for target node
    const newStageConfig = {
      systemPrompt: generateStagePrompt(targetNode, userResponse),
      voice: 'Mark',
      temperature: 0.4,
      selectedTools: generateStageTools(),
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
      hasCustomPrompt: !!targetNode.data?.customPrompt
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
      // For start and message nodes, go to first connected node
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
      // For workflow nodes, proceed to next step
      console.log('⚙️ Processing workflow node, moving to next step');
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
      return `${basePrompt}

${node.data?.content || node.data?.label || 'Process this workflow step.'}

Use the 'changeStage' tool when ready to continue to the next step.`;

    default:
      return `${basePrompt}

Process this ${node.type} node and use the 'changeStage' tool to continue the conversation flow.`;
  }
}

function generateStageTools(): ToolConfig[] {
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
}

function generateTransitionMessage(fromNode: FlowNode, toNode: FlowNode, userResponse?: string): string {
  return `Transitioned from ${fromNode.type} node (${fromNode.id}) to ${toNode.type} node (${toNode.id})${userResponse ? ` based on user response: "${userResponse}"` : ''}`;
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
    const { callId, flowData } = await request.json();
    
    if (!callId || !flowData) {
      return NextResponse.json(
        { error: 'callId and flowData are required' },
        { status: 400 }
      );
    }

    activeFlows.set(callId, flowData);
    console.log('📝 Registered flow data for call:', callId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error registering flow data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
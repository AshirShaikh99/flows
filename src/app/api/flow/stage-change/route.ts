import { NextRequest, NextResponse } from 'next/server';
import { FlowNode, ResponseOption, NodeType } from '../../../../types';

interface StageChangeRequest {
  nodeId: string;
  callId: string;
  userResponse?: string;
  flowData?: {
    nodes: FlowNode[];
    edges: { id: string; source: string; target: string }[];
  };
}

interface StageConfig {
  systemPrompt: string;
  temperature: number;
  voice: string;
  languageHint: string;
  selectedTools: ToolConfig[];
  initialMessages?: Array<{ role: string; content: string }>;
}

interface ToolConfig {
  temporaryTool: {
    modelToolName: string;
    description: string;
    dynamicParameters: DynamicParameter[];
    http: {
      baseUrlPattern: string;
      httpMethod: string;
    };
  };
}

interface DynamicParameter {
  name: string;
  location: string;
  schema: {
    type: string;
    description: string;
    enum?: string[];
  };
  required: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: StageChangeRequest = await request.json();
    const { nodeId, callId, userResponse, flowData } = body;

    console.log('Stage change tool called:', { nodeId, callId, userResponse, hasFlowData: !!flowData });

    if (!nodeId || !callId) {
      console.error('Missing required parameters:', { nodeId: !!nodeId, callId: !!callId });
      return NextResponse.json(
        { error: 'nodeId and callId are required' },
        { status: 400 }
      );
    }

    // Check if flowData is provided
    if (!flowData || !flowData.nodes || flowData.nodes.length === 0) {
      console.error('FlowData not provided or empty:', { 
        hasFlowData: !!flowData, 
        hasNodes: !!flowData?.nodes, 
        nodeCount: flowData?.nodes?.length || 0 
      });
      return NextResponse.json(
        { error: 'Flow data is required and must contain nodes' },
        { status: 400 }
      );
    }

    console.log('FlowData details:', { 
      nodeCount: flowData.nodes.length, 
      edgeCount: flowData.edges.length,
      nodeIds: flowData.nodes.map(n => n.id),
      targetNodeId: nodeId
    });

    // Find the target node in the flow data
    const targetNode = flowData.nodes.find((n: FlowNode) => n.id === nodeId);
    
    if (!targetNode) {
      console.error(`Node ${nodeId} not found in flow`, {
        searchedNodeId: nodeId,
        availableNodes: flowData.nodes.map(n => ({ id: n.id, type: n.type }))
      });
      return NextResponse.json(
        { 
          error: `Node ${nodeId} not found in flow`,
          availableNodes: flowData.nodes.map(n => n.id),
          searchedNodeId: nodeId
        },
        { status: 404 }
      );
    }

    // Generate new stage configuration based on the target node
    const newStageConfig = generateStageConfig(targetNode, userResponse);

    console.log('Generated stage config for node:', { nodeId, nodeType: targetNode.type });

    // Return the new stage configuration with the correct response type header
    const response = NextResponse.json(newStageConfig, { status: 200 });
    response.headers.set('X-Ultravox-Response-Type', 'new-stage');
    
    return response;

  } catch (error) {
    console.error('Error in stage change tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateStageConfig(node: FlowNode, userResponse?: string): StageConfig {
  const baseConfig: StageConfig = {
    systemPrompt: generateSystemPromptForNode(node, userResponse),
    temperature: 0.7,
    voice: 'Mark',
    languageHint: 'en',
    selectedTools: generateToolsForNode(node),
    // Initial messages can include context from previous interactions
    initialMessages: userResponse ? [
      {
        role: 'user',
        content: userResponse
      }
    ] : [],
  };

  return baseConfig;
}

function generateSystemPromptForNode(node: FlowNode, userResponse?: string): string {
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

You have access to a stage change tool called 'changeStage' that you can use to transition to the next appropriate node in the conversation flow.`;
  }

  // Generate default prompts based on node type
  switch (node.type) {
    case 'start':
      return `${basePrompt}

You are starting a new conversation. ${node.data?.content || 'Welcome! How can I help you today?'}

Use the 'changeStage' tool when you need to move to the next step in the conversation.`;

    case 'message':
      return `${basePrompt}

Deliver this message to the user: "${node.data?.content || node.data?.label || 'Message not configured'}"

After delivering the message, use the 'changeStage' tool to move to the next appropriate node.`;

    case 'question':
      const options = node.data?.options?.map((opt: ResponseOption) => opt.text).join(', ') || '';
      return `${basePrompt}

Ask the user this question: "${node.data?.question || node.data?.content || 'Question not configured'}"
${options ? `Available options: ${options}` : ''}

When you receive their response, use the 'changeStage' tool with their answer to proceed to the appropriate next node.`;

    case 'condition':
      return `${basePrompt}

This is a conditional node that evaluates user responses.
Condition: ${node.data?.condition?.operator || 'equals'} "${node.data?.condition?.value || ''}"

Evaluate the user's response against this condition and use the 'changeStage' tool to move to the appropriate next node based on whether the condition is met or not.`;

    case 'conversation':
      return `${basePrompt}

${node.data?.content || 'Continue the conversation with the user.'}

Use the 'changeStage' tool when you need to move to the next step in the conversation.`;

    case 'function':
      return `${basePrompt}

Execute the function described: ${node.data?.content || 'Function not configured'}

Use the 'changeStage' tool to continue after executing the function.`;

    case 'call_transfer':
      return `${basePrompt}

${node.data?.content || 'Transfer the call to another agent or number.'}

Use the 'changeStage' tool to continue after the transfer is complete.`;

    case 'press_digit':
      return `${basePrompt}

${node.data?.content || 'Wait for the user to press a digit on their keypad.'}

Use the 'changeStage' tool when the user provides digit input.`;

    case 'logic_split':
      return `${basePrompt}

This is a logic split node that branches the conversation based on conditions.
${node.data?.content || 'Evaluate conditions to determine the next path.'}

Use the 'changeStage' tool with the appropriate target node based on the logic evaluation.`;

    case 'sms':
      return `${basePrompt}

${node.data?.content || 'Send an SMS message to the user.'}

Use the 'changeStage' tool to continue after sending the SMS.`;

    case 'ending':
      return `${basePrompt}

${node.data?.content || 'End the conversation gracefully.'}

This is the final node. Conclude the conversation professionally and don't use the changeStage tool.`;

    default:
      return `${basePrompt}

Process this node and use the 'changeStage' tool to continue the conversation flow.`;
  }
}

function generateToolsForNode(node: FlowNode): ToolConfig[] {
  const tools: ToolConfig[] = [
    {
      temporaryTool: {
        modelToolName: 'changeStage',
        description: 'Transition to a new stage in the conversation flow',
        dynamicParameters: [
          {
            name: 'nodeId',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'The ID of the target node to transition to'
            },
            required: true
          },
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
            name: 'reasoning',
            location: 'PARAMETER_LOCATION_BODY',
            schema: {
              type: 'string',
              description: 'Explanation of why this transition was chosen'
            },
            required: false
          }
        ],
        http: {
          baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flow/stage-change`,
          httpMethod: 'POST'
        }
      }
    }
  ];

  // Add node-specific tools based on type
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
              description: 'The comparison operator',
              enum: ['equals', 'contains']
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
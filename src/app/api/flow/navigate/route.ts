import { NextRequest, NextResponse } from 'next/server';
import { getUltraVoxService } from '@/lib/ultravox';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, userResponse } = body;

    console.log('Flow navigation request:', { nodeId, userResponse });

    // Get the UltraVox service instance
    const ultravoxService = getUltraVoxService(process.env.ULTRAVOX_API_KEY);
    const context = ultravoxService.getExecutionContext();

    if (!context) {
      return NextResponse.json(
        { error: 'No active flow execution context' },
        { status: 400 }
      );
    }

    // Find the target node
    const targetNode = context.flowData.nodes.find(n => n.id === nodeId);
    if (!targetNode) {
      return NextResponse.json(
        { error: `Node ${nodeId} not found in flow` },
        { status: 404 }
      );
    }

    // Create stage configuration for the target node
    const systemPrompt = generateSystemPromptForNode(targetNode, context);
    
    // Return the new stage configuration
    const responseBody = {
      systemPrompt,
      voice: 'Mark',
      temperature: 0.7,
      toolResultText: `Navigated to ${targetNode.type} node: ${targetNode.data.label || targetNode.id}`,
      initialState: {
        nodeId: targetNode.id,
        nodeType: targetNode.type,
        variables: { ...context.variables, lastUserResponse: userResponse }
      }
    };

    // Set the custom header for new stage
    const response = NextResponse.json(responseBody);
    response.headers.set('X-Ultravox-Response-Type', 'new-stage');

    return response;

  } catch (error) {
    console.error('Flow navigation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateSystemPromptForNode(node: any, context: any): string {
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

After delivering the message, determine the next step and use the 'navigateFlow' tool to continue.`;

    case 'question':
      const options = node.data.options?.map((opt: any) => opt.text).join(', ') || '';
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
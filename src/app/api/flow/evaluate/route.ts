import { NextRequest, NextResponse } from 'next/server';
import { getUltraVoxService } from '@/lib/ultravox';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, conditionValue, operator } = body;

    console.log('Condition evaluation request:', { userInput, conditionValue, operator });

    // Get the UltraVox service instance
    const ultravoxService = getUltraVoxService(process.env.ULTRAVOX_API_KEY);
    const context = ultravoxService.getExecutionContext();

    if (!context) {
      return NextResponse.json(
        { error: 'No active flow execution context' },
        { status: 400 }
      );
    }

    // Evaluate the condition
    let conditionMet = false;
    switch (operator) {
      case 'equals':
        conditionMet = userInput.toLowerCase().trim() === conditionValue.toLowerCase().trim();
        break;
      case 'contains':
        conditionMet = userInput.toLowerCase().includes(conditionValue.toLowerCase());
        break;
      default:
        return NextResponse.json(
          { error: `Unknown operator: ${operator}` },
          { status: 400 }
        );
    }

    // Find the current node and determine the next node
    const currentNode = context.flowData.nodes.find(n => n.id === context.currentNodeId);
    if (!currentNode) {
      return NextResponse.json(
        { error: 'Current node not found' },
        { status: 400 }
      );
    }

    // Find edges from current node
    const edges = context.flowData.edges.filter(e => e.source === currentNode.id);
    
    // Simple logic: first edge for true, second for false, or first available
    const targetEdge = edges[conditionMet ? 0 : 1] || edges[0];
    
    if (!targetEdge) {
      return NextResponse.json(
        { error: 'No outgoing edges found from current node' },
        { status: 400 }
      );
    }

    // Find the target node
    const targetNode = context.flowData.nodes.find(n => n.id === targetEdge.target);
    if (!targetNode) {
      return NextResponse.json(
        { error: `Target node ${targetEdge.target} not found` },
        { status: 404 }
      );
    }

    // Generate system prompt for the target node
    const systemPrompt = generateSystemPromptForNode(targetNode);
    
    // Return the new stage configuration
    const responseBody = {
      systemPrompt,
      voice: 'Mark',
      temperature: 0.7,
      toolResultText: `Condition ${conditionMet ? 'met' : 'not met'}. Moving to ${targetNode.type} node: ${targetNode.data.label || targetNode.id}`,
      initialState: {
        nodeId: targetNode.id,
        nodeType: targetNode.type,
        variables: { 
          ...context.variables, 
          lastConditionResult: {
            conditionMet,
            userInput,
            conditionValue,
            operator
          }
        }
      }
    };

    // Set the custom header for new stage
    const response = NextResponse.json(responseBody);
    response.headers.set('X-Ultravox-Response-Type', 'new-stage');

    return response;

  } catch (error) {
    console.error('Condition evaluation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateSystemPromptForNode(node: any): string {
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
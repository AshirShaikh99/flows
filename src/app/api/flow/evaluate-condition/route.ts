import { NextRequest, NextResponse } from 'next/server';

interface ConditionEvaluationRequest {
  userInput: string;
  conditionValue: string;
  operator: 'equals' | 'contains';
  callId?: string;
  nodeId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConditionEvaluationRequest = await request.json();
    const { userInput, conditionValue, operator, callId, nodeId } = body;

    console.log('Condition evaluation tool called:', { userInput, conditionValue, operator, callId, nodeId });

    if (!userInput || !conditionValue || !operator) {
      return NextResponse.json(
        { error: 'userInput, conditionValue, and operator are required' },
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
          { error: `Unsupported operator: ${operator}` },
          { status: 400 }
        );
    }

    const result = {
      conditionMet,
      userInput,
      conditionValue,
      operator,
      message: `Condition ${conditionMet ? 'met' : 'not met'}. User input: "${userInput}" ${operator} "${conditionValue}"`
    };

    console.log('Condition evaluation result:', result);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error in condition evaluation tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
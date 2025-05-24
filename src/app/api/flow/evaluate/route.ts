import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userInput, conditionValue, operator } = await request.json();

    if (!userInput || !conditionValue || !operator) {
      return NextResponse.json(
        { error: 'userInput, conditionValue, and operator are required' },
        { status: 400 }
      );
    }

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
          { error: 'Invalid operator. Use "equals" or "contains"' },
          { status: 400 }
        );
    }

    console.log(`Condition evaluation: "${userInput}" ${operator} "${conditionValue}" = ${conditionMet}`);

    return NextResponse.json({
      success: true,
      conditionMet,
      userInput,
      conditionValue,
      operator,
      message: `Condition ${conditionMet ? 'met' : 'not met'}`
    });

  } catch (error) {
    console.error('Server error in condition evaluation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
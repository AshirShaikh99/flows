import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { nodeId, userResponse } = await request.json();

    if (!nodeId) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll just return a success response
    // In a real implementation, you might want to store the navigation
    // or trigger additional logic
    console.log(`Flow navigation: Moving to node ${nodeId}`, { userResponse });

    return NextResponse.json({
      success: true,
      nodeId,
      message: `Successfully navigated to node ${nodeId}`,
      userResponse
    });

  } catch (error) {
    console.error('Server error in flow navigation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
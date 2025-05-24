import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userResponse } = await request.json();

    console.log('🔄 Navigate tool called (HTTP fallback):', { userResponse });

    // This is a fallback HTTP endpoint. The actual navigation logic 
    // is handled by the client-side tool implementation in ultravox.ts
    // We just return success here to satisfy UltraVox's tool requirements
    
    return NextResponse.json({
      success: true,
      message: 'Navigation handled by client-side implementation',
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
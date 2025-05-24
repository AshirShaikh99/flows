import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { callId } = params;
    
    // Get API key from headers or environment
    const apiKey = request.headers.get('x-api-key') || process.env.ULTRAVOX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Make the API call to Ultravox from the server side
    const response = await fetch(`https://api.ultravox.ai/api/calls/${callId}/stages`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ultravox API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Ultravox API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Server error getting call stages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { callId } = params;
    const stageConfig = await request.json();
    
    // Get API key from headers or environment
    const apiKey = request.headers.get('x-api-key') || process.env.ULTRAVOX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    console.log('Creating new stage for call:', callId, 'with config:', stageConfig);

    // Make the API call to Ultravox to create a new stage
    const response = await fetch(`https://api.ultravox.ai/api/calls/${callId}/stages`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stageConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ultravox API error creating stage:', response.status, errorText);
      return NextResponse.json(
        { error: `Ultravox API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Stage created successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Server error creating call stage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
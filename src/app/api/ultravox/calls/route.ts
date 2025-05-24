import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const callConfig = await request.json();
    
    // Get the API key from environment variables (server-side)
    const apiKey = process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ultravox API key not configured' },
        { status: 500 }
      );
    }

    console.log('Proxying request to Ultravox API...');
    console.log('Request body:', callConfig);

    // Make the request to Ultravox API from the server
    const response = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(callConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ultravox API error:', errorText);
      return NextResponse.json(
        { error: `Ultravox API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Ultravox API complete response:', JSON.stringify(data, null, 2));
    console.log('Ultravox call created successfully:', data.callId);
    console.log('Join URL received:', data.joinUrl);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in create-call proxy:', error);
    return NextResponse.json(
      { error: 'Failed to create call' },
      { status: 500 }
    );
  }
} 
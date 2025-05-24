import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { callConfig, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!callConfig) {
      return NextResponse.json(
        { error: 'Call configuration is required' },
        { status: 400 }
      );
    }

    // Log the call config for debugging
    console.log('Creating UltraVox call with config:', JSON.stringify(callConfig, null, 2));

    // Make the API call to Ultravox from the server side
    const response = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(callConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ultravox API error:', response.status, errorText);
      console.error('Request body was:', JSON.stringify(callConfig, null, 2));
      return NextResponse.json(
        { error: `Ultravox API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('UltraVox API response:', JSON.stringify(data, null, 2));
    
    // Validate that we have a valid joinUrl
    if (!data.joinUrl) {
      console.error('No joinUrl in UltraVox response');
      return NextResponse.json(
        { error: 'UltraVox API did not return a joinUrl' },
        { status: 500 }
      );
    }
    
    console.log('Valid joinUrl received:', data.joinUrl);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Server error creating Ultravox call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
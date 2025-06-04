import { NextRequest, NextResponse } from 'next/server';

interface UltravoxCallConfig {
  systemPrompt: string;
  model: string;
  voice: string;
  temperature: number;
  firstSpeaker: string;
  initialOutputMedium: string;
  maxDuration: string;
  recordingEnabled: boolean;
  selectedTools: any[];
  metadata: {
    flowId: string;
    startNodeId: string;
    initialNodeId: string;
    nodeType: string;
    hasCallStages: string;
    flowData: string;
    supportsStageTransitions?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const callConfig: UltravoxCallConfig = await request.json();
    
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

    // Enhance the call config with proper call stages support
    const enhancedCallConfig = enhanceCallConfigForStages(callConfig);

    // Make the request to Ultravox API from the server
    const response = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(enhancedCallConfig),
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

function enhanceCallConfigForStages(originalConfig: UltravoxCallConfig): UltravoxCallConfig {
  // Extract the initial node ID from metadata
  const initialNodeId = originalConfig.metadata?.initialNodeId;
  const flowId = originalConfig.metadata?.flowId;
  
  // Check if changeStage tool already exists
  const existingTools = originalConfig.selectedTools || [];
  const hasChangeStageTools = existingTools.some(tool => 
    tool.temporaryTool?.modelToolName === 'changeStage' ||
    tool.toolName === 'changeStage'
  );

  let allTools = [...existingTools];

  // Only add changeStage tool if it doesn't already exist
  if (!hasChangeStageTools) {
    const changeStageTools = [
      {
        temporaryTool: {
          modelToolName: 'changeStage',
          description: 'Navigate to the next stage in the conversation flow based on user responses and current node transitions. Use this tool when the user provides a response that should trigger moving to the next step in the conversation.',
          dynamicParameters: [
            {
              name: 'userResponse',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The user\'s response or input that triggered the stage change'
              },
              required: true
            },
            {
              name: 'currentNodeId',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The ID of the current node in the flow'
              },
              required: true
            },
            {
              name: 'callId',
              location: 'PARAMETER_LOCATION_BODY',
              schema: {
                type: 'string',
                description: 'The unique identifier for this call session'
              },
              required: true
            }
          ],
          http: {
            baseUrlPattern: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://8119-2400-adc3-11b-2700-41f9-2041-a37d-5859.ngrok-free.app'}/api/flow/change-stage`,
            httpMethod: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        }
      }
    ];

    allTools = [...changeStageTools, ...existingTools];
    console.log('✅ Added changeStage tool to call configuration');
  } else {
    console.log('ℹ️ changeStage tool already exists, skipping addition');
  }

  // Generate enhanced system prompt for call stages
  const enhancedSystemPrompt = generateCallStagesSystemPrompt(
    originalConfig.systemPrompt,
    initialNodeId,
    'CALL_ID_REQUIRED' // This will be replaced by actual call ID by Ultravox
  );

  return {
    ...originalConfig,
    systemPrompt: enhancedSystemPrompt,
    selectedTools: allTools,
    // Ensure call stages metadata is properly set
    metadata: {
      ...originalConfig.metadata,
      hasCallStages: 'true',
      supportsStageTransitions: 'true'
    }
  };
}

function generateCallStagesSystemPrompt(
  originalPrompt: string,
  initialNodeId: string,
  callId: string
): string {
  return `You are an AI assistant helping users navigate through a conversational flow.
      
Current node: workflow
Node ID: ${initialNodeId}

WORKFLOW INSTRUCTIONS:
${originalPrompt}

You have access to a 'changeStage' tool that will automatically determine the next node based on the conversation flow and user responses. When calling this tool:
- Include the user's response in the 'userResponse' parameter
- Include the current node ID '${initialNodeId}' in the 'currentNodeId' parameter
- CRITICAL: Include the call ID '${callId}' in the 'callId' parameter
- The system will automatically determine and transition to the appropriate next node

IMPORTANT: Follow the workflow instructions above. This is your primary directive.`;
} 
# Ultravox Call Stages Setup Guide

## Overview

This guide explains how to properly configure Ultravox Call Stages for your conversational flow system. The implementation uses the official Ultravox Call Stages API for seamless navigation between flow nodes.

## Environment Configuration

Create or update your `.env.local` file with the following variables:

```bash
# Ultravox API Configuration
NEXT_PUBLIC_ULTRAVOX_API_KEY=your_ultravox_api_key_here
ULTRAVOX_API_KEY=your_ultravox_api_key_here

# Base URL for API endpoints (use ngrok URL for development)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Call Stages Configuration
ULTRAVOX_CALL_STAGES_ENABLED=true
```

## Architecture Changes

### 1. New Call Stages API Endpoint

**Endpoint**: `/api/flow/change-stage`

This endpoint properly implements the Ultravox Call Stages protocol:
- Returns responses with `X-Ultravox-Response-Type: new-stage` header
- Generates proper stage configurations with systemPrompt, tools, and voice settings
- Handles flow navigation based on user responses and node transitions

### 2. Enhanced Call Creation

The Ultravox calls API (`/api/ultravox/calls`) now:
- Automatically adds the `changeStage` tool to all calls
- Generates proper system prompts for call stages
- Sets up metadata for flow tracking

### 3. Tool-Based Navigation

The AI agent now uses a `changeStage` tool with these parameters:
- `userResponse`: The user's input that triggered the navigation
- `currentNodeId`: The ID of the current node in the flow  
- `callId`: The unique call identifier

## Key Features

### ✅ Proper Call Stages Integration
- Uses official Ultravox Call Stages API
- Automatic stage transitions with proper headers
- Maintains conversation context between stages

### ✅ Enhanced Transition Matching
- Intelligent response matching for workflow transitions
- Support for positive/negative responses
- Medical, transfer, and appointment-related triggers
- Fallback navigation logic

### ✅ Better Error Handling
- Proper error responses with user-friendly messages
- Debugging information in console logs
- Graceful handling of missing flow data

### ✅ Backward Compatibility
- Deprecated `/api/flow/simple-navigate` endpoint still works
- Migration warnings and recommendations
- Gradual transition path to new API

## Usage

### 1. Start Development Server

```bash
npm run dev
```

### 2. Set Up ngrok (for webhook testing)

```bash
ngrok http 3000
```

Update your `NEXT_PUBLIC_BASE_URL` with the ngrok URL.

### 3. Create a Flow

1. Build your conversational flow with nodes and transitions
2. Configure transition labels that match expected user responses
3. Add custom prompts to nodes as needed

### 4. Test Call Stages

1. Start a call through your flow interface
2. The system will automatically:
   - Initialize the call with Call Stages support
   - Add the `changeStage` tool
   - Set up proper system prompts
   - Handle navigation between nodes

## API Response Format

### Successful Navigation Response

```json
{
  "systemPrompt": "You are an AI assistant...",
  "model": "fixie-ai/ultravox-70B",
  "voice": "Mark",
  "temperature": 0.4,
  "languageHint": "en",
  "selectedTools": [...],
  "toolResultText": "Successfully transitioned to workflow stage.",
  "initialMessages": [
    {
      "role": "MESSAGE_ROLE_USER",
      "text": "User's response"
    }
  ]
}
```

### Headers
```
X-Ultravox-Response-Type: new-stage
Content-Type: application/json
```

## Transition Matching Logic

The system intelligently matches user responses to transitions:

### Positive Responses
- "yes", "want", "interested", "learn" → matches transitions with similar keywords

### Negative Responses  
- "no", "not", "busy" → matches negative transitions

### Specialized Responses
- Medical: "surgery", "operation", "medical"
- Transfer: "agent", "human", "transfer"
- Appointments: "reschedule", "change", "appointment"

## Migration from Simple Navigate

If you're using the old `/api/flow/simple-navigate` endpoint:

1. **Immediate**: It will continue working with deprecation warnings
2. **Recommended**: Update to use the `changeStage` tool automatically
3. **Future**: Plan to remove dependency on deprecated endpoint

The new system provides:
- Better conversation flow management
- Proper Ultravox Call Stages integration
- Enhanced state management
- Improved error handling

## Debugging

### Console Logs

Look for these log messages:
- `🎭 Change Stage Tool called:` - Stage transition initiated
- `✅ Generated new stage config:` - Successful stage configuration  
- `🔍 Determining next node from:` - Navigation logic
- `✅ Matched response to transition:` - Successful response matching

### Common Issues

1. **Missing Flow Data**: Ensure flow is properly registered before starting call
2. **Tool Not Called**: Check if `changeStage` tool is properly configured
3. **Navigation Failures**: Verify node IDs and edge connections in flow data
4. **Environment Issues**: Confirm `NEXT_PUBLIC_BASE_URL` is accessible to Ultravox

## Testing

Test your implementation with various user responses:

```bash
# Test positive response
"Yes, I want to learn Flutter"

# Test negative response  
"No, I'm too busy right now"

# Test medical scenario
"I have a surgery coming up"

# Test transfer request
"Can I speak to a human agent?"
```

The system should properly navigate to the corresponding nodes based on your flow configuration.

## Best Practices

1. **Clear Transition Labels**: Use descriptive labels that match expected user responses
2. **Fallback Handling**: Always provide at least one outgoing edge from each node
3. **Custom Prompts**: Use node-specific prompts for better conversation flow
4. **Error Monitoring**: Monitor console logs for navigation issues
5. **Flow Testing**: Test all possible paths through your conversational flow

## Support

For issues with this implementation:
1. Check console logs for detailed error messages
2. Verify environment variables are properly set
3. Ensure ngrok URL is accessible and properly configured
4. Test with simple flows before complex scenarios 
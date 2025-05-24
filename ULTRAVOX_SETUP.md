# UltraVox Integration Setup Guide

## Overview
This application now includes UltraVox integration for voice-based conversational flows. The CORS issues have been resolved by implementing server-side API routes.

## Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```bash
# UltraVox API Configuration
NEXT_PUBLIC_ULTRAVOX_API_KEY=your_ultravox_api_key_here
ULTRAVOX_API_KEY=your_ultravox_api_key_here

# Base URL for the application (used for tool endpoints)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## How to Get Your UltraVox API Key

1. Sign up at [UltraVox](https://ultravox.ai)
2. Navigate to your dashboard
3. Generate an API key
4. Copy the API key to your `.env.local` file

## Testing the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create a simple flow:**
   - Add a Start node (already present)
   - Add a Message node
   - Connect them with an edge

3. **Test the voice call:**
   - Click the "🎤 UltraVox" button in the top toolbar
   - Click "Start Call" in the UltraVox panel
   - The agent should speak first with the message from your start node

## Features Implemented

### ✅ Fixed CORS Issues
- All UltraVox API calls now go through server-side routes
- No more "X-API-Key is not allowed by Access-Control-Allow-Headers" errors

### ✅ Agent Speaks First
- Configured `firstSpeaker: 'FIRST_SPEAKER_AGENT'`
- Added `firstSpeakerSettings` with initial message
- Agent will greet the user when the call starts

### ✅ WebSocket Integration
- Uses `ultravox-client` SDK for real-time communication
- Proper session management and event handling

### ✅ Flow Navigation Tools
- Registered client-side tools for flow navigation
- API endpoints for handling tool calls
- Condition evaluation support

## API Routes Created

- `POST /api/ultravox/calls` - Create new UltraVox calls
- `GET /api/ultravox/calls/[callId]/stages` - Get call stages
- `GET /api/ultravox/calls/[callId]/stages/[stageId]` - Get specific stage
- `POST /api/flow/navigate` - Handle flow navigation
- `POST /api/flow/evaluate` - Handle condition evaluation

## Troubleshooting

### "API key is required" Error
- Make sure your `.env.local` file has the correct API key
- Restart the development server after adding environment variables

### "Failed to create call" / "400 Bad Request" Error
- **Most Common Cause**: Missing or invalid API key
  - Ensure your `.env.local` file exists in the project root
  - Check that `NEXT_PUBLIC_ULTRAVOX_API_KEY` is set with your actual key
  - Restart the development server after adding environment variables
- Check that your UltraVox API key is valid
- Ensure you have sufficient credits in your UltraVox account
- Check the browser console and server logs for detailed error messages

### "Invalid enum value BODY" Error
- ✅ **FIXED**: Updated parameter location enums to use `PARAMETER_LOCATION_BODY` format
- This was resolved by updating the TypeScript types to match UltraVox API expectations

### Agent Not Speaking
- Verify the `firstSpeakerSettings` configuration
- Check that your flow has a start node with content
- Ensure the WebSocket connection is established

### Server Stopped/Empty Reply
- If the server crashes during testing, restart with `npm run dev`
- Check for TypeScript compilation errors in the terminal

## Next Steps

1. **Add more node types** - Extend the flow with question and condition nodes
2. **Implement stage transitions** - Add logic to move between flow nodes based on user responses
3. **Add voice customization** - Allow users to select different voices
4. **Add call recording** - Enable call recording and playback features

## Code Structure

```
src/
├── lib/
│   └── ultravox.ts              # UltraVox service with fixed CORS
├── app/api/
│   ├── ultravox/
│   │   └── calls/               # Server-side UltraVox API routes
│   └── flow/
│       ├── navigate/            # Flow navigation endpoint
│       └── evaluate/            # Condition evaluation endpoint
└── components/
    └── UltraVoxCallManager.tsx  # UI component for call management
```

The implementation follows UltraVox best practices and uses server-side API routes to avoid CORS issues while maintaining secure API key handling. 
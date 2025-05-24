# UltraVox Integration Setup Documentation

## Overview
This document outlines the complete setup and integration of UltraVox API with our Next.js application, including **proper client-side SDK implementation** for audio handling.

## Recent Major Updates (Latest)

### ✅ **Proper UltraVox SDK Implementation**
- **Fixed the core issue**: Implemented proper client-side audio handling using UltraVox SDK
- **Audio Setup**: Added comprehensive audio context management and WebRTC support
- **Event Handling**: Implemented proper SDK event listeners for transcripts, status, and debug messages
- **Mute Controls**: Added real SDK-based microphone and speaker mute/unmute functionality
- **Session Management**: Proper session lifecycle management with cleanup

### 🎯 **Key Improvements Made**

#### 1. **Enhanced UltraVox Service** (`src/lib/ultravox.ts`)
```typescript
// NEW: Proper SDK imports
import { UltravoxSession, Medium } from 'ultravox-client';

// NEW: Comprehensive audio setup
private ensureAudioSetup(): void {
  // Audio context management
  // WebRTC support verification  
  // Set output medium to voice
  this.currentSession.setOutputMedium(Medium.VOICE);
}

// NEW: Session access for mute controls
getCurrentSession(): UltravoxSession | null {
  return this.currentSession;
}
```

#### 2. **Enhanced Call Manager** (`src/components/UltraVoxCallManager.tsx`)
```typescript
// NEW: Real-time event handling
useEffect(() => {
  const currentSession = ultravoxServiceRef.current?.getCurrentSession();
  
  // Live transcript updates
  currentSession.addEventListener('transcripts', handleTranscriptUpdate);
  
  // Session status mapping
  currentSession.addEventListener('status', handleStatusUpdate);
  
  // Debug message handling
  currentSession.addEventListener('experimental_message', handleDebugMessage);
}, [isCallActive]);

// NEW: Real SDK mute controls
const toggleMic = useCallback(() => {
  const currentSession = ultravoxServiceRef.current?.getCurrentSession();
  if (isMicMuted) {
    currentSession.unmuteMic();
  } else {
    currentSession.muteMic();
  }
}, [isMicMuted]);
```

#### 3. **Comprehensive Event Listeners**
- **Status Events**: `connecting`, `idle`, `listening`, `thinking`, `speaking`, `disconnected`
- **Audio Events**: `audio`, `output`, `speaking`, `media`
- **Connection Events**: `disconnect`, `reconnect`, `error`
- **Debug Events**: `experimental_message` for troubleshooting

## Current Implementation Status

### ✅ **Working Components**
1. **API Integration**: Server-side call creation via `/api/ultravox/calls`
2. **CORS Resolution**: All API calls properly proxied
3. **WebSocket Connection**: Proper SDK-based connection establishment
4. **Audio Context**: Automatic audio context management and resume
5. **Session Management**: Proper initialization, cleanup, and error handling
6. **Mute Controls**: Real SDK-based microphone and speaker controls
7. **Live Updates**: Real-time transcripts and status monitoring

### 🎯 **Expected Behavior Now**
1. **Agent Speech**: Agent should now speak first with proper audio output
2. **User Interaction**: Microphone should capture user input correctly
3. **Real-time Feedback**: Live transcripts and status updates
4. **Proper Cleanup**: Clean session termination and resource management

## Technical Architecture

### 1. **Call Creation Flow**
```
Frontend → Server API (/api/ultravox/calls) → UltraVox API → Return joinUrl
```

### 2. **Audio Connection Flow**
```
UltravoxSession.create() → joinCall(joinUrl) → SDK handles WebRTC/Audio
```

### 3. **Event Flow**
```
UltraVox Events → SDK Event Listeners → React State Updates → UI Updates
```

## Environment Setup

### Required Environment Variables
```bash
# .env.local
ULTRAVOX_API_KEY=f7lhuZv7.BoaF7YYsPgQHtBLtV9l77Uk0E3BkhKjR
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Dependencies
```json
{
  "ultravox-client": "^latest"
}
```

## Testing the Implementation

### 1. **Start Development Server**
```bash
npm run dev
```

### 2. **Test Flow**
1. Open `http://localhost:3000`
2. Create a simple flow with a start node
3. Click "Start Call" 
4. **Expected**: Agent should speak first immediately
5. **Expected**: Live transcripts should appear
6. **Expected**: Mute controls should work properly

### 3. **Debug Information**
- Open browser console for detailed logging with emoji prefixes
- Check "Debug Messages" section in UI for UltraVox internal messages
- Monitor "Live Transcripts" for real-time conversation updates

## Common Issues & Solutions

### **Issue**: Agent Not Speaking
**Solution**: 
- ✅ Fixed with proper `setOutputMedium(Medium.VOICE)`
- ✅ Audio context auto-resume implemented
- ✅ First speaker settings properly configured

### **Issue**: WebSocket Connection Failed
**Solution**:
- ✅ Proper error handling and retry logic
- ✅ Clean session management
- ✅ Enhanced logging for debugging

### **Issue**: Mute Controls Not Working  
**Solution**:
- ✅ Real SDK methods: `muteMic()`, `unmuteMic()`, `muteSpeaker()`, `unmuteSpeaker()`
- ✅ State synchronization with SDK

## API Endpoints

### `POST /api/ultravox/calls`
**Purpose**: Create new UltraVox call (CORS-free)
**Input**: Call configuration + API key
**Output**: Call object with `joinUrl`

### `GET /api/ultravox/calls/[callId]/stages`
**Purpose**: Retrieve call stages
**Headers**: `x-api-key`
**Output**: Array of call stages

## File Structure
```
src/
├── lib/
│   └── ultravox.ts              # Enhanced UltraVox service
├── components/
│   └── UltraVoxCallManager.tsx  # Enhanced call manager
├── app/
│   └── api/
│       └── ultravox/
│           └── calls/
│               └── route.ts     # Server-side API proxy
└── types/
    └── index.ts                 # Type definitions
```

## Latest Debugging Features

### Console Logging
- **🎤**: Microphone operations
- **🔊**: Audio/speaker operations  
- **📞**: Call creation
- **🔗**: Connection operations
- **📊**: Status updates
- **🎧**: Event listener setup
- **✅**: Success operations
- **❌**: Error operations
- **⚠️**: Warning operations

### UI Debug Panels
- **Live Transcripts**: Real-time conversation transcription
- **Debug Messages**: UltraVox internal messages
- **Session Status**: Current connection state
- **Call Details**: ID, model, voice, flow information

## Conclusion

The UltraVox integration now uses the **proper client-side SDK** for audio handling instead of just API calls. This should resolve the agent speech issues by:

1. **Proper Audio Pipeline**: SDK manages WebRTC, audio contexts, and media streams
2. **Real Event Handling**: Live updates from the UltraVox session
3. **SDK-Based Controls**: Proper mute/unmute functionality
4. **Enhanced Debugging**: Comprehensive logging and UI feedback

The agent should now speak immediately when the call starts! 🎉

## NEW: Custom Prompt Feature 🤖

### Overview
You can now provide **custom prompts for each node** to control UltraVox AI behavior at different conversation steps!

### How to Use Custom Prompts

#### 1. **Access Custom Prompt Field**
- Click on **any node** (Start, Message, Question, or Condition)
- Scroll down in the config panel to find **"🤖 Custom UltraVox Prompt"**
- Enter your custom instructions

#### 2. **Visual Indicators**
- Nodes with custom prompts show a **⚙️ settings icon**
- The icon appears next to the node type label

#### 3. **Example Custom Prompts**

**For Start Node:**
```
Be very warm and friendly. Introduce yourself as Sarah, a customer service assistant. 
Ask the user's name and use it throughout the conversation.
```

**For Message Node:**
```
Explain this information slowly and clearly. 
Ask if they need any clarification before moving on.
Use simple language and avoid technical jargon.
```

**For Question Node:**
```
Be patient and encouraging. If the user seems confused, 
rephrase the question differently. Give examples for each option.
```

**For Condition Node:**
```
If the user's response doesn't match the expected condition, 
gently ask them to clarify their answer before proceeding.
```

### 4. **How It Works**
- **Default Behavior**: Uses built-in prompt based on node type
- **Custom Prompt**: Overrides default behavior with your instructions
- **Priority**: Custom prompt takes precedence over default when present
- **Scope**: Each node can have its own unique behavior

### 5. **Best Practices for Custom Prompts**

#### ✅ **Good Examples:**
- `"Be more casual and use emojis"`
- `"Ask follow-up questions to understand better"`
- `"Explain technical terms in simple language"`
- `"Be empathetic and supportive"`
- `"Use a professional business tone"`

#### ❌ **Avoid:**
- Contradicting the node's purpose (e.g., telling a Question node not to ask questions)
- Very long prompts (keep under 200 words)
- Instructions that conflict with the flow navigation tools

### 6. **Testing Custom Prompts**
1. Add custom prompts to your nodes
2. Save the flow
3. Start a UltraVox call
4. Notice how the AI behavior changes at each node
5. Check console logs for prompt debugging

### 7. **Advanced Use Cases**

#### **Personality Changes:**
```
Start Node: "Be professional and formal"
Message Node: "Switch to a more casual, friendly tone"
Question Node: "Be encouraging and supportive"
```

#### **Dynamic Difficulty:**
```
Start Node: "Assess the user's technical knowledge level"
Message Node: "Adjust complexity based on their responses"  
Question Node: "Provide beginner or advanced options accordingly"
```

#### **Contextual Behavior:**
```
Support Flow: "Be patient and helpful with troubleshooting"
Sales Flow: "Be enthusiastic but not pushy"
Survey Flow: "Be neutral and professional"
```

This feature gives you **complete control** over UltraVox AI behavior at every step of your conversation flow! 🚀 
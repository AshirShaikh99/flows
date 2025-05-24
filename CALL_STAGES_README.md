# Call Stages Implementation with Context7

This document describes the implementation of UltraVox Call Stages functionality with Context7 integration for dynamic, multi-stage conversations.

## Overview

The Call Stages implementation allows you to create dynamic, multi-stage conversations where each stage can have:
- Different system prompts
- Different tools
- Different voice settings
- Updated conversation history
- State management with Context7

## Architecture

### Core Components

1. **FlowContext** (`src/lib/flow-context.tsx`)
   - React context for managing flow state
   - Handles stage transitions
   - Manages call status and variables
   - Integrates with Context7 for state management

2. **UltraVoxFlowService** (`src/lib/ultravox.ts`)
   - Main service for UltraVox integration
   - Handles Call Stages creation and transitions
   - Manages tools and session events

3. **Stage Change Tool** (`src/app/api/flow/stage-change/route.ts`)
   - API endpoint for stage transitions
   - Returns new stage configurations
   - Implements UltraVox Call Stages protocol

4. **UltraVoxCallManager** (`src/components/UltraVoxCallManager.tsx`)
   - UI component for call management
   - Shows current stage and history
   - Handles stage change callbacks

## Key Features

### 1. Dynamic Stage Transitions

Each node in your flow becomes a stage with its own configuration:

```typescript
interface StageConfig {
  systemPrompt: string;
  temperature: number;
  voice: string;
  languageHint: string;
  selectedTools: ToolConfig[];
  initialMessages?: Array<{ role: string; content: string }>;
}
```

### 2. Visual Stage Indicators

- Active stages are highlighted in the flow builder
- Stage history is displayed in the call manager
- Real-time status updates

### 3. Context7 Integration

The implementation uses Context7 principles for:
- State management across components
- Reactive updates to UI
- Centralized flow data management

### 4. Tool-Based Navigation

The agent uses tools to navigate between stages:

```typescript
// Stage change tool
{
  temporaryTool: {
    modelToolName: 'changeStage',
    description: 'Transition to a new stage in the conversation flow',
    dynamicParameters: [
      {
        name: 'nodeId',
        location: 'PARAMETER_LOCATION_BODY',
        schema: {
          type: 'string',
          description: 'The ID of the target node to transition to'
        },
        required: true
      }
    ],
    http: {
      baseUrlPattern: '/api/flow/stage-change',
      httpMethod: 'POST'
    }
  }
}
```

## Implementation Details

### Stage Change Flow

1. **Agent Decision**: The AI agent decides to transition to a new stage
2. **Tool Call**: Agent calls the `changeStage` tool with target node ID
3. **API Processing**: Stage change API processes the request
4. **New Stage Config**: API returns new stage configuration
5. **UltraVox Transition**: UltraVox creates new stage with updated config
6. **UI Update**: Context updates and UI reflects new stage

### System Prompt Generation

Each node type has specific prompt generation:

```typescript
switch (node.type) {
  case 'start':
    return `You are starting a new conversation. ${node.data?.content}
    Use the 'changeStage' tool when you need to move to the next step.`;
    
  case 'message':
    return `Deliver this message: "${node.data?.content}"
    After delivering, use 'changeStage' tool to move to the next step.`;
    
  case 'question':
    return `Ask this question: "${node.data?.question}"
    When you receive their response, use 'changeStage' tool to proceed.`;
    
  case 'condition':
    return `Evaluate user responses against condition.
    Use 'evaluateCondition' tool to determine the next step.`;
}
```

### State Management

The FlowContext provides centralized state management:

```typescript
interface FlowState {
  flowData: FlowData;
  currentStageId: string | null;
  stageHistory: string[];
  callStatus: CallStatus;
  isCallActive: boolean;
  currentStages: UltraVoxCallStage[];
  variables: Record<string, unknown>;
}
```

## API Endpoints

### 1. Stage Change Tool
- **Endpoint**: `POST /api/flow/stage-change`
- **Purpose**: Handle stage transitions
- **Response**: New stage configuration with `X-Ultravox-Response-Type: new-stage` header

### 2. Condition Evaluation
- **Endpoint**: `POST /api/flow/evaluate-condition`
- **Purpose**: Evaluate conditions for conditional nodes
- **Response**: Condition result and next steps

### 3. Call Stages Management
- **Endpoint**: `GET/POST /api/ultravox/calls/[callId]/stages`
- **Purpose**: Manage UltraVox call stages
- **Response**: Stage data and configurations

## Usage

### 1. Setup Environment

```bash
# Set your UltraVox API key
NEXT_PUBLIC_ULTRAVOX_API_KEY=your_api_key_here
ULTRAVOX_API_KEY=your_api_key_here
```

### 2. Create Flow

1. Open the Flow Builder
2. Add nodes (start, message, question, condition)
3. Connect nodes with edges
4. Configure each node's content and prompts

### 3. Start Call with Stages

1. Click "Show Call Manager"
2. Click "Start Call"
3. The system will:
   - Create UltraVox call with Call Stages support
   - Set up stage change tools
   - Begin conversation at start node

### 4. Monitor Stage Transitions

- Watch the visual indicators in the flow builder
- Monitor stage history in the call manager
- View real-time conversation transcripts

## Context7 Integration

The implementation follows Context7 principles:

### 1. Reactive State Management
```typescript
const { currentStageId, callStatus, transitionToStage } = useCallStages();
```

### 2. Component Composition
```typescript
<FlowProvider>
  <FlowBuilder />
</FlowProvider>
```

### 3. Centralized Data Flow
```typescript
const { setFlowData, getNodeById, isNodeActive } = useFlowData();
```

## Debugging

### 1. Enable Debug Mode

The call manager shows debug messages and transcripts for troubleshooting.

### 2. Console Logging

Key events are logged with emojis for easy identification:
- 🔄 Stage transitions
- 📞 Call creation
- 🔧 Tool registration
- ✅ Success events
- ❌ Error events

### 3. Visual Indicators

- Blue border: Active stage
- Stage history: Shows progression
- Status indicators: Call state

## Best Practices

### 1. Stage Design

- Keep stages focused on single tasks
- Use clear, specific prompts
- Plan transition logic carefully

### 2. Error Handling

- Handle network failures gracefully
- Provide fallback stages
- Log errors for debugging

### 3. Performance

- Minimize stage transitions
- Cache flow data appropriately
- Use efficient state updates

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   - Ensure environment variables are configured
   - Restart development server after changes

2. **Stage Transitions Not Working**
   - Check tool registration
   - Verify API endpoints are accessible
   - Review console logs for errors

3. **UI Not Updating**
   - Ensure FlowProvider wraps components
   - Check context hook usage
   - Verify state updates

### Debug Steps

1. Check browser console for errors
2. Verify API key configuration
3. Test API endpoints directly
4. Review UltraVox session status
5. Check flow data structure

## Future Enhancements

1. **Advanced Conditions**
   - Complex condition evaluation
   - Multiple condition operators
   - Nested conditions

2. **Stage Templates**
   - Pre-built stage configurations
   - Reusable stage patterns
   - Stage libraries

3. **Analytics**
   - Stage transition metrics
   - Conversation flow analysis
   - Performance monitoring

4. **Enhanced Context7 Integration**
   - More sophisticated state management
   - Advanced reactive patterns
   - Better component composition

## Conclusion

This Call Stages implementation provides a robust foundation for creating dynamic, multi-stage conversations with UltraVox. The integration with Context7 principles ensures maintainable, scalable code with excellent developer experience.

For more information, refer to:
- [UltraVox Call Stages Documentation](https://docs.ultravox.ai/guides/callstages)
- [Context7 Documentation](https://github.com/upstash/context7)
- [React Flow Documentation](https://reactflow.dev/) 
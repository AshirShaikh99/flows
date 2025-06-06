# Conversation Flow Builder with UltraVox Integration

A visual conversation flow builder built with React, ReactFlow, and Next.js that allows users to create interactive conversation flows with branching logic. Now integrated with UltraVox SDK for voice-enabled conversational AI calls.

![Flow Builder Demo](https://via.placeholder.com/800x400/f3f4f6/374151?text=Conversation+Flow+Builder)

## Features

### 🎯 Core Features
- **Visual Flow Builder**: Drag-and-drop interface for creating conversation flows
- **Multiple Node Types**: Start, Message, Question, and Condition nodes
- **Dynamic Connections**: Connect nodes with visual arrows to create conversation paths
- **Configuration Panel**: Easy-to-use forms for configuring each node type
- **Save & Load**: Persist flows to localStorage with export/import functionality
- **Real-time Preview**: See your flow changes immediately
- **🎤 UltraVox Integration**: Voice-enabled conversational AI with call stages
- **Real-time Call Management**: Start, manage, and monitor voice calls through flows
- **Intelligent Stage Transitions**: Automatic flow navigation based on conversation context

### 🏗️ Node Types

#### Start Node (Green Circle)
- **Purpose**: Entry point for every conversation flow
- **Features**: 
  - Auto-created when flow starts
  - Cannot be deleted or modified
  - Green circular design with play icon

#### Message Node (Blue Rectangle)
- **Purpose**: Display AI messages/responses to users
- **Configuration**:
  - Message content (textarea with character counter)
  - Rich text support
- **Connections**: Single input, single output

#### Question Node (Purple Rectangle)
- **Purpose**: Ask users questions with predefined response options
- **Configuration**:
  - Question text
  - Up to 4 response options
  - Dynamic output handles (one per option)
- **Features**: Add/remove options dynamically

#### Condition Node (Yellow Diamond)
- **Purpose**: Branch conversations based on user responses
- **Configuration**:
  - Select which previous question to check
  - Condition operator (equals, contains)
  - Value to compare against
- **Connections**: Two outputs (Yes/No branches)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flows
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```bash
   # UltraVox API Configuration
   NEXT_PUBLIC_ULTRAVOX_API_KEY=your_ultravox_api_key_here
   ULTRAVOX_API_KEY=your_ultravox_api_key_here
   
   # Base URL for webhook endpoints (set this to your deployed URL in production)
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage Guide

### Creating Your First Flow

1. **Start with the Start Node**
   - Every flow begins with a green Start node (automatically created)

2. **Add Nodes**
   - Drag nodes from the left sidebar to the canvas
   - Available nodes: Message, Question, Condition

3. **Connect Nodes**
   - Click and drag from a node's output handle to another node's input handle
   - Question nodes have multiple outputs (one per response option)
   - Condition nodes have two outputs (Yes/No)

4. **Configure Nodes**
   - Click any node to open the configuration panel on the right
   - Fill in the required information for each node type

### Node Configuration

#### Message Node Configuration
- **Message Content**: Enter the text that will be displayed to users
- **Character Counter**: Shows current message length

#### Question Node Configuration
- **Question Text**: The question to ask users
- **Response Options**: 
  - Add up to 4 response options
  - Each option creates a separate output handle
  - Use the + button to add new options
  - Use the trash icon to remove options

#### Condition Node Configuration
- **Question to Check**: Select from existing Question nodes
- **Condition**: Choose between "equals" or "contains"
- **Value to Compare**: The value to check against user responses

### Flow Management

#### Saving Flows
- **Save Button**: Saves your flow to browser localStorage
- **Auto-save**: Node configurations are saved automatically on blur

#### Exporting Flows
- **Export Button**: Downloads your flow as a JSON file
- **File Format**: Standard JSON format for easy backup/sharing

#### Clearing Flows
- **Clear Button**: Removes all nodes except the Start node
- **Confirmation**: Asks for confirmation before clearing

#### Reset View
- **Reset View Button**: Centers and fits the flow in the viewport

### UltraVox Voice Integration

#### Starting a Voice Call
1. **Configure your flow** with the desired conversation structure
2. **Click the UltraVox button** (🎤) in the top toolbar to open the call manager
3. **Start Call** to initiate a voice conversation using your flow
4. **Monitor the call** through the real-time status indicators

#### Call Stages and Flow Navigation
- Each flow node automatically becomes a **call stage** in UltraVox
- The AI agent uses **temporary tools** to navigate between nodes based on user responses
- **Condition nodes** evaluate user input and branch accordingly
- **Question nodes** present options and wait for user responses
- **Message nodes** deliver information and automatically proceed

#### Call Management Features
- **Real-time status** indicators (Starting, Active, Ended, Failed)
- **Microphone and speaker** controls
- **Call transcripts** and debug messages
- **Current node tracking** with visual indicators
- **Automatic stage transitions** based on conversation flow

#### API Integration
The system uses UltraVox's call stages API to:
- Create calls with dynamic system prompts
- Register flow navigation tools
- Handle stage transitions via webhooks
- Maintain conversation context and variables

## Technical Architecture

### Tech Stack
- **React 19**: Modern React with hooks
- **Next.js 15**: Full-stack React framework
- **ReactFlow**: Visual flow library for node-based interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **TypeScript**: Type-safe development
- **UltraVox SDK**: Voice-enabled conversational AI platform

### Project Structure
```
src/
├── components/
│   ├── FlowBuilder.tsx        # Main flow builder component
│   ├── NodeSidebar.tsx        # Left sidebar with draggable nodes
│   ├── ConfigPanel.tsx        # Right configuration panel
│   ├── UltraVoxCallManager.tsx # UltraVox call management component
│   └── nodes/
│       ├── StartNode.tsx      # Green start node component
│       ├── MessageNode.tsx    # Blue message node component
│       ├── QuestionNode.tsx   # Purple question node component
│       └── ConditionNode.tsx  # Yellow condition node component
├── lib/
│   └── ultravox.ts           # UltraVox service and flow integration
├── types.ts                   # TypeScript type definitions
└── app/
    ├── api/
    │   └── flow/
    │       ├── navigate/      # Flow navigation API endpoint
    │       └── evaluate/      # Condition evaluation API endpoint
    ├── page.tsx              # Main application page
    ├── layout.tsx            # Root layout
    └── globals.css           # Global styles
```

### Key Components

#### FlowBuilder
- Main container component
- Manages React Flow state
- Handles drag & drop operations
- Provides save/load functionality

#### Node Components
- Custom React Flow node implementations
- Handle-based connection system
- Visual feedback for selection states

#### ConfigPanel
- Dynamic forms based on selected node type
- Real-time updates to node data
- Validation and user feedback

## Customization

### Adding New Node Types

1. **Create the node component** in `src/components/nodes/`
2. **Add the type** to `src/types.ts`
3. **Register the node** in `FlowBuilder.tsx`
4. **Add configuration** in `ConfigPanel.tsx`
5. **Add to sidebar** in `NodeSidebar.tsx`

### Styling Customization
- All styles use Tailwind CSS classes
- Node colors and shapes can be customized in individual node components
- Layout dimensions are configurable in the main components

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses HTML5 Canvas for ReactFlow rendering

## Performance
- Optimized for flows with 100+ nodes
- React.memo used for node components
- Efficient re-rendering with useCallback hooks

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License
MIT License - feel free to use this project for personal or commercial purposes.

## Support
For issues, questions, or contributions, please visit the project repository or create an issue.

---

**Happy Flow Building!** 🚀

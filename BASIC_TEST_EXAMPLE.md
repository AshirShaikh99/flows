# 🧪 BASIC TESTING EXAMPLE - Simple Customer Greeting Flow

## 🎯 **Simple Flow to Test Your System**

This is a basic 3-node flow that you can create and test immediately to verify everything works!

---

## 🏗️ **Flow Structure to Create**

```
📞 START → 🎯 GREETING → ✅ GOODBYE
```

**Flow Description**: A simple greeting conversation that asks the user how they are and then says goodbye.

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Open Your App**
```
Navigate to: http://localhost:3000
```

### **Step 2: Create the Flow Visually**

#### **Node 1: Start Node**
1. **Drag** "Start" node from left sidebar to canvas
2. **Click** the node to open configuration panel
3. **Configure**:
   - **Content**: `Welcome! I'm here to help you today.`
   - **Custom Prompt**: `Greet the user warmly and ask how they're doing. Then use changeStage to move to greeting-node.`

#### **Node 2: Greeting Node** 
1. **Drag** "Workflow Node" from sidebar to canvas
2. **Click** the node to configure
3. **Change ID** to: `greeting-node`
4. **Configure**:
   - **Node Title**: `Greeting Conversation`
   - **Content**: `How are you doing today? I hope you're having a great day!`
   - **Custom Prompt**: `Listen to the user's response about how they're doing. Respond appropriately with empathy. After they respond, use changeStage to move to goodbye-node.`

#### **Node 3: Goodbye Node**
1. **Drag** another "Workflow Node" from sidebar
2. **Click** to configure  
3. **Change ID** to: `goodbye-node`
4. **Configure**:
   - **Node Title**: `Goodbye`
   - **Content**: `Thank you for chatting with me! Have a wonderful day!`
   - **Custom Prompt**: `Say a warm goodbye to the user. This is the end of the conversation, so do not use changeStage.`

### **Step 3: Connect the Nodes**
1. **Connect Start → Greeting**: Click and drag from start node to greeting-node
2. **Connect Greeting → Goodbye**: Click and drag from greeting-node to goodbye-node

### **Step 4: Save Your Flow**
- Click the **"Save"** button in the top toolbar

---

## 🎤 **Testing the Voice Conversation**

### **Step 1: Start Call Manager**
1. Click **"Show Call Manager"** button (top-right)
2. Click **"Start Call"** (green button)

### **Step 2: Test the Conversation**
1. **AI will say**: "Welcome! I'm here to help you today. How are you doing today?"
2. **You respond**: "I'm doing well, thank you!"
3. **Watch**: The greeting-node should light up blue
4. **AI will say**: Something empathetic, then goodbye message
5. **Watch**: The goodbye-node should light up blue

### **Step 3: Observe Visual Feedback**
- ✅ **Nodes glow blue** when active
- ✅ **Edges animate** during transitions  
- ✅ **Stage history** shows in call manager
- ✅ **Transcripts** appear in real-time

---

## 🧪 **Alternative: API Testing Without Voice**

If you want to test just the transition logic without voice:

```bash
# Test the start node
curl -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1", 
    "callId": "test-basic-flow",
    "flowData": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start", 
          "data": {
            "content": "Welcome! I'\''m here to help you today.",
            "customPrompt": "Greet the user warmly and ask how they'\''re doing. Then use changeStage to move to greeting-node."
          }
        },
        {
          "id": "greeting-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "Greeting Conversation",
            "content": "How are you doing today?",
            "customPrompt": "Listen to the user'\''s response about how they'\''re doing. After they respond, use changeStage to move to goodbye-node."
          }
        },
        {
          "id": "goodbye-node", 
          "type": "workflow",
          "data": {
            "nodeTitle": "Goodbye",
            "content": "Thank you for chatting with me!",
            "customPrompt": "Say a warm goodbye to the user. This is the end of the conversation."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "greeting-node"},
        {"id": "e2", "source": "greeting-node", "target": "goodbye-node"}
      ]
    }
  }'
```

**Expected Response**: Should include `changeStage` tool with `greeting-node` as an option.

---

## 🎯 **What You Should See**

### **✅ Visual Indicators**
- **Blue glowing border** around active node
- **Pulsing animation** on current stage
- **Edge animations** showing flow path
- **Stage indicator** in top-right panel

### **✅ Call Manager Display**
- **Current Stage**: Shows active node name
- **Stage History**: Breadcrumb of visited nodes  
- **Transcripts**: Live conversation text
- **Debug Messages**: Technical transition info

### **✅ Smooth Transitions**
1. **Start** → AI greets, asks how you are
2. **Greeting** → AI responds to your answer empathetically  
3. **Goodbye** → AI says farewell and ends

---

## 🚨 **Troubleshooting**

### **If Transitions Don't Work:**
1. **Check Custom Prompts**: Make sure they mention `changeStage` and target node IDs
2. **Verify Node IDs**: greeting-node and goodbye-node must match exactly
3. **Check Edges**: Nodes must be connected with proper edges
4. **API Key**: Set `NEXT_PUBLIC_ULTRAVOX_API_KEY` for voice calls

### **If Visual Feedback Missing:**
1. **Refresh Browser**: Sometimes React state needs reset
2. **Check Console**: Look for any JavaScript errors
3. **Verify Save**: Make sure flow is saved before testing

---

## 🎉 **Success Criteria**

✅ **Flow Creation**: You can drag, connect, and configure nodes  
✅ **Visual Feedback**: Nodes light up during transitions  
✅ **API Integration**: Stage changes work via backend API  
✅ **Voice Calls**: UltraVox integration functional  
✅ **Real-time Updates**: UI reflects conversation state  

**If all these work, your system is 100% functional!** 🚀

---

## 💡 **Next Steps After Testing**

Once this basic example works:
1. **Create more complex flows** with branching logic
2. **Add conditional transitions** based on user responses  
3. **Test customer support scenarios** with multiple paths
4. **Experiment with different node types** and configurations

**This simple example proves your entire system is working correctly!** 🎯 
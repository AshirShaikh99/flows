# 🔄 TRANSITION FLOW EXAMPLE - Step by Step

## 🎯 **Simple 3-Node Flow with Transitions**

```
📞 START → 🤔 ASK QUESTION → ✅ GOODBYE
```

This example shows **exactly how to create transitions** that you can test immediately!

---

## 🏗️ **Step 1: Create the Flow Structure**

### **Node 1: Start Node**
```
Node ID: start-node
Node Type: Start

Content:
Hello! I'm your assistant. How can I help you today?

Custom Prompt:
Greet the user and ask how you can help. After they respond with any question, use changeStage to move to question-node.
```

### **Node 2: Question Handler Node**
```
Node ID: question-node
Node Type: Workflow Node

Node Title: Question Handler
Content:
I understand your question. Let me help you with that.

Custom Prompt:
The user has asked a question. Provide a helpful response to their question. After answering, use changeStage to move to goodbye-node.
```

### **Node 3: Goodbye Node**
```
Node ID: goodbye-node
Node Type: Workflow Node

Node Title: Goodbye
Content:
Thank you for your question! Have a great day!

Custom Prompt:
Say goodbye to the user. This is the end of the conversation, so do not use changeStage.
```

---

## 🔗 **Step 2: Create the Transitions**

### **Edge Connections (Very Important!):**
1. **Connect start-node → question-node**
2. **Connect question-node → goodbye-node**

**How to connect in your UI:**
1. Click the **output handle** (small circle) on the right side of start-node
2. Drag to the **input handle** (small circle) on the left side of question-node
3. Repeat for question-node → goodbye-node

---

## 🧪 **Step 3: Test the Transitions**

### **Test Conversation Flow:**
1. **AI says**: "Hello! I'm your assistant. How can I help you today?"
2. **You say**: "What's the weather like?"
3. **Expected**: Transitions to question-node, node glows blue
4. **AI says**: "I understand your question. Let me help you with that. [responds about weather]"
5. **Expected**: Transitions to goodbye-node, node glows blue
6. **AI says**: "Thank you for your question! Have a great day!"

---

## 🎪 **Step 4: Visual Implementation**

### **In Your Browser:**
1. **Open**: `http://localhost:3000`
2. **Drag nodes**:
   - 1 Start node (rename ID to `start-node`)
   - 2 Workflow nodes (rename IDs to `question-node` and `goodbye-node`)
3. **Connect with edges**: start → question → goodbye
4. **Configure each node** with the exact content and prompts above
5. **Save the flow**
6. **Start Call Manager** and test!

---

## 🔬 **Step 5: API Test (Quick Verification)**

```bash
# Test the first transition: start-node → question-node
curl -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-node",
    "callId": "transition-test",
    "userResponse": "What time is it?",
    "flowData": {
      "nodes": [
        {
          "id": "start-node",
          "type": "start",
          "data": {
            "content": "Hello! I'\''m your assistant. How can I help you today?",
            "customPrompt": "After they respond with any question, use changeStage to move to question-node."
          }
        },
        {
          "id": "question-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "Question Handler",
            "content": "I understand your question.",
            "customPrompt": "After answering, use changeStage to move to goodbye-node."
          }
        },
        {
          "id": "goodbye-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "Goodbye",
            "content": "Thank you! Have a great day!",
            "customPrompt": "Say goodbye. Do not use changeStage."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-node", "target": "question-node"},
        {"id": "e2", "source": "question-node", "target": "goodbye-node"}
      ]
    }
  }'
```

**Expected Response**: Should include `changeStage` with `question-node`

---

## 🎯 **What You'll See When Transitions Work:**

### **Visual Indicators:**
- ✅ **Blue glow** around active node
- ✅ **Animated edges** showing transition path
- ✅ **Stage history** in call manager showing: start-node → question-node → goodbye-node
- ✅ **Real-time transcripts** of the conversation

### **Conversation Flow:**
```
User: "Hello"
AI: "Hello! I'm your assistant. How can I help you today?"
[TRANSITION: start-node → question-node]

User: "What's the weather?"
AI: "I understand your question. Let me help you with that. [weather response]"
[TRANSITION: question-node → goodbye-node]

AI: "Thank you for your question! Have a great day!"
[END: No more transitions]
```

---

## 🚨 **Troubleshooting Transitions**

### **If No Transitions Happen:**
1. **Check Node IDs**: Must match exactly (start-node, question-node, goodbye-node)
2. **Check Edges**: Nodes must be connected with visual lines
3. **Check Custom Prompts**: Must mention `changeStage` and target node ID
4. **Check Save**: Flow must be saved before testing

### **If Wrong Transitions:**
1. **Check Edge Directions**: start-node → question-node → goodbye-node
2. **Check Prompt Keywords**: Make prompts very specific about when to transition
3. **Check Target Node Names**: Must match the actual node IDs exactly

---

## 🎉 **Success Criteria**

✅ **Transition 1**: start-node → question-node (when user asks anything)
✅ **Transition 2**: question-node → goodbye-node (after answering)
✅ **Visual Feedback**: Nodes glow blue during active stage
✅ **No Transition**: goodbye-node stays active (conversation ends)

**This example guarantees you'll see transitions working!** 🚀

---

## 💡 **Key Points for Transitions to Work:**

1. **Node IDs must be exact** (no spaces, match exactly)
2. **Edges must connect the nodes** (visual lines between them)
3. **Custom Prompts must mention changeStage and target node**
4. **Flow must be saved** before testing
5. **Call Manager shows real-time transitions**

**Copy this example exactly and you'll see transitions working immediately!** ✨ 
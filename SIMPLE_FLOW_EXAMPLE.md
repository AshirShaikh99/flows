# 🎯 SIMPLE CUSTOMER SUPPORT FLOW - Copy & Test

## 🏗️ **Flow Structure**
```
📞 START → 🤔 QUESTION TYPE → 📧 EMAIL SUPPORT
                          → 📞 PHONE SUPPORT
```

**Flow Purpose**: Route customers to the right support channel based on their question type.

---

## 📋 **Node Configuration - Copy These Exactly**

### **Node 1: Start Node**
```
Node Type: Start
Node ID: start-1

Content:
Hello! I'm here to help you with your support request. Are you having a technical issue or do you need help with billing?

Custom Prompt:
Greet the customer and ask if they need help with technical issues or billing. If they mention "technical", "tech", "not working", "broken", or "error", use changeStage to move to tech-support. If they mention "billing", "payment", "charge", "invoice", or "account", use changeStage to move to billing-support.
```

### **Node 2: Technical Support Node**
```
Node Type: Workflow Node
Node ID: tech-support

Node Title: Technical Support
Content:
I understand you're having a technical issue. For faster resolution, I'll connect you with our technical support team via email.

Custom Prompt:
The user has a technical issue. Offer to send them an email with troubleshooting steps and technical support contact information. This is the end of this conversation path.
```

### **Node 3: Billing Support Node**
```
Node Type: Workflow Node  
Node ID: billing-support

Node Title: Billing Support
Content:
I see you have a billing question. Let me connect you directly with our billing specialist who can help you right away.

Custom Prompt:
The user has a billing question. Offer to transfer them to a billing specialist or provide billing support contact information. This is the end of this conversation path.
```

---

## 🔗 **Edge Connections**
1. **Start → Technical**: Connect `start-1` to `tech-support`
2. **Start → Billing**: Connect `start-1` to `billing-support`

---

## 🧪 **Test Scenarios**

### **Scenario A: Technical Issue**
1. **AI says**: "Hello! I'm here to help you with your support request. Are you having a technical issue or do you need help with billing?"
2. **You say**: "My app isn't working properly"
3. **Expected**: Should transition to `tech-support` node
4. **Visual**: Tech support node glows blue

### **Scenario B: Billing Question**
1. **AI says**: "Hello! I'm here to help you with your support request. Are you having a technical issue or do you need help with billing?"
2. **You say**: "I have a question about my invoice"
3. **Expected**: Should transition to `billing-support` node
4. **Visual**: Billing support node glows blue

---

## 🎪 **Step-by-Step Implementation**

### **Step 1: Create the Flow**
1. Open `http://localhost:3000`
2. Drag **Start** node to canvas
3. Drag **2 Workflow Nodes** to canvas
4. Connect nodes with edges as shown above

### **Step 2: Configure Nodes**
Copy the exact configurations above into each node.

### **Step 3: Test with Voice**
1. Click **"Show Call Manager"**
2. Click **"Start Call"**
3. Test both scenarios above

### **Step 4: Test with API** (Optional)
```bash
# Test technical support path
curl -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1",
    "callId": "simple-support-test",
    "userResponse": "My app is broken and not working",
    "flowData": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start",
          "data": {
            "content": "Hello! I'\''m here to help you with your support request. Are you having a technical issue or do you need help with billing?",
            "customPrompt": "If they mention technical, tech, not working, broken, or error, use changeStage to move to tech-support. If they mention billing, payment, charge, invoice, or account, use changeStage to move to billing-support."
          }
        },
        {
          "id": "tech-support",
          "type": "workflow",
          "data": {
            "nodeTitle": "Technical Support",
            "content": "I understand you'\''re having a technical issue.",
            "customPrompt": "Offer technical support assistance."
          }
        },
        {
          "id": "billing-support",
          "type": "workflow",
          "data": {
            "nodeTitle": "Billing Support", 
            "content": "I see you have a billing question.",
            "customPrompt": "Offer billing support assistance."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "tech-support"},
        {"id": "e2", "source": "start-1", "target": "billing-support"}
      ]
    }
  }'
```

---

## 🎯 **Success Indicators**

### **✅ Working Correctly When:**
- **Technical keywords** → Routes to tech-support node
- **Billing keywords** → Routes to billing-support node
- **Nodes glow blue** when active
- **Edges animate** during transitions
- **Stage history** shows the path taken

### **🔧 Troubleshooting:**
- If routing is wrong, check the **Custom Prompt** keywords
- If no transitions happen, verify **node IDs** match exactly
- If visual feedback missing, check **edge connections**

---

## 💡 **Keyword Triggers**

### **Technical Path:**
- "technical", "tech", "not working", "broken", "error"
- "app issue", "website down", "can't login"
- "bug", "glitch", "problem with software"

### **Billing Path:**
- "billing", "payment", "charge", "invoice", "account"
- "subscription", "refund", "price", "cost"
- "credit card", "payment method", "billing question"

---

## 🚀 **Why This Example Works**

1. **Clear Keywords**: Distinct trigger words for each path
2. **Simple Logic**: Only 2 choices, easy to test
3. **Real-world Use**: Practical customer support scenario
4. **Visual Feedback**: Easy to see which path was taken
5. **Quick Testing**: Can test both paths in under 2 minutes

**Copy these configurations exactly and you'll have a working conditional flow in minutes!** 🎉 
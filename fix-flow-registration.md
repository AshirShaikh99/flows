# 🔧 FIXING FLOW DATA REGISTRATION ISSUE

## 🚨 **Problem Identified**
Your flow transitions aren't working because the flow data isn't being registered with the UltraVox call.

**Error**: `❌ No flow data found for call ID: call-1234567890`

---

## 🎯 **Quick Fix: Manual Flow Registration**

### **Step 1: Register Your Flow Before Testing**

Before starting a voice call, manually register your flow data:

```bash
# Register your current flow with the test call ID
curl -X PUT http://localhost:3000/api/flow/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "call-1234567890",
    "flowData": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start",
          "data": {
            "content": "Say Hello to {{customer_name}}, and ask the user if now is a good time to talk.",
            "customPrompt": "Greet the customer warmly. If they are free/available, use changeStage to move to user-is-free. If busy, use changeStage to move to user-is-busy."
          }
        },
        {
          "id": "user-is-free",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Free",
            "content": "Great! Since you have time, how can I help you?",
            "customPrompt": "The user is available. Proceed with helping them."
          }
        },
        {
          "id": "user-is-busy",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Busy",
            "content": "I understand you are busy. When would be better?",
            "customPrompt": "The user is busy. Ask for a better time."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "user-is-free"},
        {"id": "e2", "source": "start-1", "target": "user-is-busy"}
      ]
    }
  }'
```

### **Step 2: Test Transitions**

Now test your transitions:

```bash
# Test the "user is free" transition
curl -X POST http://localhost:3000/api/flow/simple-navigate \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "Yes, I have time to talk",
    "currentNodeId": "start-1",
    "callId": "call-1234567890"
  }'
```

**Expected**: Should show successful navigation to `user-is-free`

---

## 🛠️ **Long-term Fix: Auto-Registration**

### **Issue in FlowBuilder Component**

The issue is that your flow builder saves to localStorage but doesn't automatically register with active calls.

### **Fix 1: Modify Save Function**

Update your FlowBuilder to auto-register on save:

```typescript
// In src/components/FlowBuilder.tsx - add this to your saveFlow function
const saveFlow = useCallback(async () => {
  const flowData: FlowData = {
    nodes: nodes as FlowNode[],
    edges: edges,
  };
  
  // Save to localStorage
  localStorage.setItem('conversation-flow', JSON.stringify(flowData));
  
  // ALSO register with any active calls
  if (callStatus === 'STATUS_ACTIVE' && currentCallId) {
    try {
      const response = await fetch('/api/flow/navigate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callId: currentCallId, 
          flowData 
        })
      });
      
      if (response.ok) {
        showToastMessage('Flow saved and registered with active call!');
      } else {
        showToastMessage('Flow saved locally (call registration failed)');
      }
    } catch (error) {
      showToastMessage('Flow saved locally (call registration failed)');
    }
  } else {
    showToastMessage('Flow saved successfully!');
  }
}, [nodes, edges, callStatus, currentCallId, showToastMessage]);
```

### **Fix 2: UltraVox Call Manager Integration**

Make sure your UltraVox Call Manager registers the flow when starting calls:

```typescript
// In UltraVoxCallManager - when starting a call
const startCall = async () => {
  try {
    // Get current flow data
    const flowData: FlowData = {
      nodes: nodes as FlowNode[],
      edges: edges,
    };
    
    // Create call with flow data
    const call = await ultraVoxService.createCall(flowData);
    
    // The service should auto-register, but verify:
    console.log('✅ Call created with flow data:', call.callId);
    
  } catch (error) {
    console.error('❌ Call creation failed:', error);
  }
};
```

---

## 🧪 **Testing Your Fix**

### **Test 1: Verify Registration**
```bash
# After registering, check if it worked
curl -X POST http://localhost:3000/api/flow/simple-navigate \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "Test",
    "currentNodeId": "start-1", 
    "callId": "call-1234567890"
  }'
```

**Success**: Should NOT show "No flow data found"

### **Test 2: Check Stored Data**
The logs should show:
```
✅ Stored flow data with keys: [call-1234567890, call-1234567890, new_call, new call, current_call]
📊 Total active flows: 5
```

### **Test 3: Visual Flow Test**
1. **Register flow** (Step 1 above)
2. **Open browser**: `http://localhost:3000`
3. **Start Call Manager** → "Start Call"
4. **Test transitions**: Say "I'm free" or "I'm busy"
5. **Watch**: Nodes should glow blue during transitions

---

## 🎯 **Why This Happened**

Your flow builder has excellent visual functionality, but there's a **disconnect** between:

1. **Visual Flow Builder** → Saves to localStorage
2. **Voice Call System** → Needs flow data registered via API

The fix bridges this gap by ensuring flow data is available to the voice system.

---

## 🚀 **Quick Test Command**

Run this single command to test if the fix worked:

```bash
# One-shot test (register + test transition)
curl -X PUT http://localhost:3000/api/flow/navigate \
  -H "Content-Type: application/json" \
  -d '{"callId":"call-1234567890","flowData":{"nodes":[{"id":"start-1","type":"start","data":{"content":"Hello","customPrompt":"If free, use changeStage to move to user-is-free. If busy, use changeStage to move to user-is-busy."}},{"id":"user-is-free","type":"workflow","data":{"nodeTitle":"Free"}},{"id":"user-is-busy","type":"workflow","data":{"nodeTitle":"Busy"}}],"edges":[{"id":"e1","source":"start-1","target":"user-is-free"},{"id":"e2","source":"start-1","target":"user-is-busy"}]}}' && \
curl -X POST http://localhost:3000/api/flow/simple-navigate \
  -H "Content-Type: application/json" \
  -d '{"userResponse":"Yes, I have time","currentNodeId":"start-1","callId":"call-1234567890"}'
```

**Expected Output**: Should show successful transition to "user-is-free" node! ✅ 
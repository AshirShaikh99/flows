# Fix: Agent Not Speaking Availability Slots

## 🔍 Problem Analysis

The agent is reaching the check availability node but not speaking the slots from the Cal API response. This happens because:

1. **Agent isn't calling the tool**: The agent may not be properly instructed to use `checkCalendarAvailability`
2. **Tool response not spoken**: Even if the tool is called, the response might not be spoken
3. **Flow data not loaded**: The API requires flow data to access Cal.com configuration

## ✅ Solution Implementation

### 1. **Enhanced System Prompts**

Updated both navigation and UltraVox prompts to be more explicit:

```typescript
IMPORTANT: You MUST use the 'checkCalendarAvailability' tool to check available time slots. Here's the process:

1. If the user hasn't provided a specific date, ask for their preferred date or date range
2. IMMEDIATELY use the checkCalendarAvailability tool with:
   - startDate: The date they want (YYYY-MM-DD format)
   - endDate: Optional end date for range checking
   - nodeId: "${node.id}"

3. The tool will return speech-optimized availability slots (e.g., "Option 1: Monday, January 15th at two o'clock PM")
4. Present these available slots to the user exactly as returned by the tool
5. Ask which option they prefer
6. Use the 'changeStage' tool to continue to booking when they choose a slot

CRITICAL: You must call the checkCalendarAvailability tool to get real availability data. Do not make up availability information.
```

### 2. **Improved API Error Handling**

Added fallback to fetch flow data from UltraVox API if not found in memory:

```typescript
// Fallback: Try to fetch from UltraVox API if not found in memory
if (!flowData) {
  const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
    headers: {
      'X-API-Key': process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY || '',
      'Content-Type': 'application/json'
    }
  });
  
  if (callResponse.ok) {
    const callData = await callResponse.json();
    if (callData.metadata?.flowData) {
      flowData = JSON.parse(callData.metadata.flowData);
    }
  }
}
```

### 3. **Enhanced Speech Formatting**

The Cal service already provides speech-optimized formatting:

- **Time**: "2:00 PM" → "two o'clock PM"
- **Date**: "Monday, January 15" → "Monday, January 15th"
- **Options**: Clear "Option 1", "Option 2" format

## 🔧 Implementation Steps

### Step 1: Update Node Configuration

Make sure your check availability node has a clear custom prompt:

```json
{
  "id": "check-availability-node",
  "type": "cal_check_availability",
  "data": {
    "customPrompt": "Perfect! Let me check our available appointment slots for you. I'll use our real-time calendar system to find the best available times for you. What dates work best for you?",
    "calApiKey": "your_cal_api_key",
    "calEventTypeId": "your_event_type_id",
    "calTimezone": "America/Los_Angeles"
  }
}
```

### Step 2: Ensure Flow Data is Loaded

Always load flow data before testing:

```bash
curl -X PUT "http://localhost:3000/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: YOUR_CALL_ID" \
  -d @your-flow.json
```

### Step 3: Verify Tool Instructions

The agent should receive these tools:
- `checkCalendarAvailability`: For checking availability
- `changeStage`: For transitioning to next node

## 🎯 Testing Instructions

### For Voice Agents (UltraVox):

1. **Agent should ask for dates**: "What dates work best for you?"
2. **Agent should call tool**: Use `checkCalendarAvailability` with proper parameters
3. **Agent should speak response**: Present the `responseText` from tool response
4. **Response should be speech-friendly**: "Option 1: Monday, January 15th at two o'clock PM"

### For Testing API Directly:

```bash
# Run the debug script
./debug-availability-issue.sh
```

This will test the complete flow and show exactly where any issues occur.

## 🔬 Debugging Checklist

- [ ] Flow data is loaded successfully
- [ ] Agent receives correct system prompt
- [ ] Agent has access to `checkCalendarAvailability` tool
- [ ] Tool parameters include correct `nodeId`
- [ ] API returns `responseText` with speech formatting
- [ ] Agent speaks the `responseText` exactly as received

## 💡 Quick Fix for Testing

If the agent still doesn't speak slots, try this explicit instruction in your flow:

```json
{
  "customPrompt": "I will now check our available appointment slots using our calendar system. Let me call the checkCalendarAvailability tool to get real-time availability data. [AGENT: You must immediately use the checkCalendarAvailability tool when you reach this node. Do not proceed without calling this tool first.]"
}
```

## 🎪 Expected Behavior

**User**: "I'd like to schedule an appointment"
**Agent**: "Perfect! Let me check our available appointment slots for you. What dates work best for you?"
**User**: "How about next Monday?"
**Agent**: *[Calls checkCalendarAvailability tool with startDate: "2025-06-09"]*
**Agent**: "Great news! I found several available appointment slots for you. Here are your options:

Option 1: Monday, June 9th at nine o'clock AM
Option 2: Monday, June 9th at two o'clock PM  
Option 3: Monday, June 9th at four thirty PM

Please tell me which time slot works best for you by saying the option number, or tell me the specific day and time you prefer. I'll be happy to book that appointment for you right away."

The key is ensuring the agent **always calls the tool** and **speaks the responseText exactly as returned**. 
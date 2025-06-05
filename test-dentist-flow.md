# 🦷 Dentist Appointment Flow - Test Guide

## 🚀 **Setup Complete!**

Your dentist appointment booking flow is now fully operational with Cal.com integration.

## 📋 **Flow Structure**

```
[Start] → [Welcome] → [Check Availability] → [Booking Confirmation]
```

### **1. Welcome Node**
- **Prompt**: "Hello! I am Tony from SmileBright Dental Clinic. Thank you for calling! How can I help you today? Are you looking to schedule an appointment or do you have questions about our services?"
- **Transition**: When user mentions appointment → Check Availability

### **2. Check Availability Node** 
- **Prompt**: "Great! Let me check our available appointment slots for you. What dates work best for you? I can check this week or next week."
- **Cal.com Integration**: 
  - ✅ API Key: `cal_live_ad0e0bc39a4d9d0bb6f9cb0961192b3b`
  - ✅ Event Type: `1575900` (15 Min Meeting)
  - ✅ Timezone: `America/Los_Angeles`

### **3. Booking Confirmation Node**
- **Prompt**: "Perfect! I will help you book that appointment. Can you please provide your full name and email address so I can confirm your dental appointment booking?"

## 🧪 **Test Commands**

### **Load Flow Data**
```bash
curl -X PUT "http://localhost:3000/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -d @dentist-flow-example.json
```

### **Test Flow Navigation**
```bash
curl -X POST "http://localhost:3000/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "I would like to schedule an appointment",
    "currentNodeId": "welcome-node", 
    "callId": "dentist-demo-123"
  }'
```

### **Test Cal.com Availability Check**
```bash
curl -X POST "http://localhost:3000/api/cal/check-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-06-09",
    "endDate": "2025-06-11", 
    "nodeId": "check-availability-node"
  }'
```

## ✅ **Expected Results**

### **1. Flow Navigation Response**
```json
{
  "systemPrompt": "...dental clinic assistant...",
  "selectedTools": [
    {
      "temporaryTool": {
        "modelToolName": "checkCalendarAvailability",
        "description": "Check available time slots in the calendar using Cal.com"
      }
    }
  ]
}
```

### **2. Availability Check Response**
```json
{
  "success": true,
  "availability": [
    {
      "time": "9:00 PM",
      "date": "Monday, June 9, 2025", 
      "available": true
    }
  ],
  "responseText": "Here are the available time slots:\n\n1. Monday, June 9, 2025 at 9:00 PM\n...\n\nWhich time slot would you prefer?"
}
```

## 🎭 **Sample Conversation Flow**

**Agent**: "Hello! I am Tony from SmileBright Dental Clinic. Thank you for calling! How can I help you today?"

**User**: "I'd like to schedule a dental appointment"

**Agent**: "Great! Let me check our available appointment slots for you. What dates work best for you?"

**User**: "How about next Monday or Tuesday?"

**Agent**: *[Calls checkCalendarAvailability tool]* 
"Here are the available time slots:
1. Monday, June 9, 2025 at 9:00 PM
2. Monday, June 9, 2025 at 9:15 PM
...
Which time slot would you prefer?"

**User**: "I'll take Monday at 9:00 PM"

**Agent**: "Perfect! I will help you book that appointment. Can you please provide your full name and email address?"

## 🔧 **Current Status**

- ✅ **Ngrok**: `https://6f4f-2400-adc3-11b-2700-2818-6b4-f640-d87d.ngrok-free.app`
- ✅ **Dev Server**: `http://localhost:3000`
- ✅ **Flow Data**: Loaded and accessible
- ✅ **Cal.com API**: v2 integration working
- ✅ **UltraVox Tools**: Available to agent

## 🎯 **Ready for Production Testing!**

Your dentist appointment flow is ready to be tested with actual UltraVox calls. The agent will be able to:

1. **Greet patients** professionally as Tony from the dental clinic
2. **Check real availability** from your Cal.com calendar
3. **Guide patients** through the booking process
4. **Provide specific time slots** with proper formatting

The integration is complete and fully functional! 🚀 
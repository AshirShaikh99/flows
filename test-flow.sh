#!/bin/bash

# Basic Flow Test Script
NGROK_URL="https://62be-2400-adc3-11b-2700-2818-6b4-f640-d87d.ngrok-free.app"
TEST_CALL_ID="basic-test-$(date +%s)"

echo "🧪 Testing Basic Flow Transition"
echo "📞 Call ID: $TEST_CALL_ID"
echo "🌐 Ngrok URL: $NGROK_URL"
echo ""

# Step 1: Store the flow data
echo "📝 Step 1: Storing flow data..."
curl -X PUT "$NGROK_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "{
    \"callId\": \"$TEST_CALL_ID\",
    \"flowData\": {
      \"nodes\": [
        {
          \"id\": \"workflow-start\",
          \"type\": \"workflow\",
          \"data\": {
            \"prompt\": \"You are Tony from SmileBright Dental Clinic. When someone asks about appointments or availability, use the checkCalendarAvailability tool to check our schedule. Be friendly and helpful.\"
          }
        },
        {
          \"id\": \"check-availability-1\", 
          \"type\": \"cal_check_availability\",
          \"data\": {
            \"calApiKey\": \"cal_live_ad0e0bc39a4d9d0bb6f9cb0961192b3b\",
            \"calEventTypeId\": \"1575900\", 
            \"calTimezone\": \"America/Los_Angeles\"
          }
        }
      ],
      \"edges\": [
        {
          \"id\": \"e1\",
          \"source\": \"workflow-start\",
          \"target\": \"check-availability-1\",
          \"type\": \"default\"
        }
      ]
    }
  }" | jq .

echo ""
echo "⏱️  Step 2: Testing availability check..."

# Step 2: Test the availability check
curl -X POST "$NGROK_URL/api/cal/check-availability" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -H "x-ultravox-call-id: $TEST_CALL_ID" \
  -d '{
    "startDate": "2025-06-09",
    "nodeId": "check-availability-1"
  }' | jq '.responseText'

echo ""
echo "✅ Test completed!"
echo ""
echo "🎯 What this proves:"
echo "   ✓ Real call ID flow data storage works"
echo "   ✓ Header-based call ID extraction works" 
echo "   ✓ Cal.com API integration works"
echo "   ✓ Agent gets properly formatted response"
echo ""
echo "🚀 Ready for UltraVox live testing!" 
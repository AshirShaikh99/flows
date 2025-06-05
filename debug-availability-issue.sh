#!/bin/bash

echo "🔍 Debug: Availability Check Issue"
echo "=================================="

# Configuration
BASE_URL="http://localhost:3000"
CALL_ID="debug-availability-$(date +%s)"

echo "📋 Debug Configuration:"
echo "Base URL: $BASE_URL"
echo "Call ID: $CALL_ID"
echo ""

# Step 1: Load flow data first
echo "1️⃣ Loading Enhanced Flow Data..."
FLOW_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d @enhanced-dentist-flow.json)

echo "Flow Load Response: $FLOW_RESPONSE"
echo ""

# Step 2: Navigate to availability check node
echo "2️⃣ Navigating to Availability Check Node..."
NAV_RESPONSE=$(curl -s -X POST "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "userResponse": "I would like to schedule a dental appointment",
    "currentNodeId": "welcome-node",
    "callId": "'$CALL_ID'"
  }')

echo "Navigation Response: $NAV_RESPONSE"
echo ""

# Step 3: Test availability check with flow data loaded
echo "3️⃣ Testing Availability Check (with loaded flow data)..."
AVAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cal/check-availability" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "startDate": "2025-06-09",
    "endDate": "2025-06-11", 
    "nodeId": "check-availability-node"
  }')

echo "Availability Response: $AVAIL_RESPONSE"
echo ""

# Step 4: Check if responseText is properly formatted
echo "4️⃣ Checking Response Format..."
RESPONSE_TEXT=$(echo "$AVAIL_RESPONSE" | jq -r '.responseText // "NO_RESPONSE_TEXT"')
echo "Response Text: $RESPONSE_TEXT"
echo ""

# Step 5: Check if slots are speech-formatted
echo "5️⃣ Checking Speech Formatting..."
if echo "$RESPONSE_TEXT" | grep -q "Option [0-9]"; then
    echo "✅ Found 'Option X' formatting"
else
    echo "❌ Missing 'Option X' formatting"
fi

if echo "$RESPONSE_TEXT" | grep -q "o'clock\|thirty\|fifteen"; then
    echo "✅ Found speech-friendly time formatting"
else
    echo "❌ Missing speech-friendly time formatting"
fi

if echo "$RESPONSE_TEXT" | grep -q "1st\|2nd\|3rd\|th"; then
    echo "✅ Found ordinal date formatting"
else
    echo "❌ Missing ordinal date formatting"
fi

echo ""

# Step 6: Test what happens if agent calls the tool (simulate)
echo "6️⃣ Checking Tool Configuration..."
TOOLS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "userResponse": "Can you check availability for next week?",
    "currentNodeId": "check-availability-node",
    "callId": "'$CALL_ID'"
  }')

echo "Tools Response: $TOOLS_RESPONSE"
echo ""

# Step 7: Summary
echo "📊 Debug Summary:"
echo "================"

if echo "$AVAIL_RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
    echo "✅ Availability API is working"
else
    echo "❌ Availability API has issues"
fi

if echo "$AVAIL_RESPONSE" | jq -e '.responseText' >/dev/null 2>&1; then
    echo "✅ Response text is being returned"
else
    echo "❌ No response text in API response"
fi

if echo "$NAV_RESPONSE" | jq -e '.systemPrompt' >/dev/null 2>&1; then
    echo "✅ Navigation is working"
else
    echo "❌ Navigation has issues"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. If availability API works but agent doesn't speak slots:"
echo "   → Agent needs better instruction to use checkCalendarAvailability tool"
echo "2. If responseText is properly formatted:"
echo "   → Issue is likely in agent prompt/tool usage"
echo "3. If navigation works:"
echo "   → Check if agent receives tools and instructions properly"

echo ""
echo "💡 Agent Instructions Should Include:"
echo "- MUST use checkCalendarAvailability tool"
echo "- Pass nodeId parameter correctly"
echo "- Present responseText exactly as received"
echo "- Don't make up availability data" 
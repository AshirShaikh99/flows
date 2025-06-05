#!/bin/bash

echo "🦷 Enhanced Cal Integration Test - SmileBright Dental Clinic"
echo "=========================================================="

# Configuration
BASE_URL="http://localhost:3000"
CALL_ID="enhanced-dentist-test-$(date +%s)"

echo "📋 Test Configuration:"
echo "Base URL: $BASE_URL"
echo "Call ID: $CALL_ID"
echo ""

# Test 1: Load Enhanced Flow Data
echo "1️⃣ Loading Enhanced Flow Data..."
curl -X PUT "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d @enhanced-dentist-flow.json

echo ""
echo ""

# Test 2: Navigate to Availability Check
echo "2️⃣ Testing Navigation to Availability Check..."
curl -X POST "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "userResponse": "I would like to schedule a dental appointment",
    "currentNodeId": "welcome-node",
    "callId": "'$CALL_ID'"
  }' | jq .

echo ""
echo ""

# Test 3: Test Enhanced Availability Check (Speech-Optimized)
echo "3️⃣ Testing Enhanced Availability Check with Speech Formatting..."
curl -X POST "$BASE_URL/api/cal/check-availability" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "startDate": "2025-06-09",
    "endDate": "2025-06-11", 
    "nodeId": "check-availability-node"
  }' | jq .

echo ""
echo ""

# Test 4: Navigate to Booking Confirmation
echo "4️⃣ Testing Navigation to Booking Confirmation..."
curl -X POST "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "userResponse": "Yes, I want to book option 1",
    "currentNodeId": "check-availability-node",
    "callId": "'$CALL_ID'"
  }' | jq .

echo ""
echo ""

# Test 5: Start Booking Confirmation Process
echo "5️⃣ Testing Booking Confirmation - Step 1: Collect..."
curl -X POST "$BASE_URL/api/cal/booking-confirmation" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "startDateTime": "2025-06-09T14:00:00.000Z",
    "duration": 60,
    "nodeId": "booking-confirmation-node",
    "confirmationStep": "collect"
  }' | jq .

echo ""
echo ""

# Test 6: Confirm First Name
echo "6️⃣ Testing Booking Confirmation - Step 2: First Name..."
curl -X POST "$BASE_URL/api/cal/booking-confirmation" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "name": "John",
    "startDateTime": "2025-06-09T14:00:00.000Z",
    "duration": 60,
    "nodeId": "booking-confirmation-node",
    "confirmationStep": "confirm_first_name"
  }' | jq .

echo ""
echo ""

# Test 7: Confirm Last Name  
echo "7️⃣ Testing Booking Confirmation - Step 3: Last Name..."
curl -X POST "$BASE_URL/api/cal/booking-confirmation" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "name": "John Smith",
    "startDateTime": "2025-06-09T14:00:00.000Z",
    "duration": 60,
    "nodeId": "booking-confirmation-node",
    "confirmationStep": "confirm_last_name"
  }' | jq .

echo ""
echo ""

# Test 8: Confirm Email
echo "8️⃣ Testing Booking Confirmation - Step 4: Email..."
curl -X POST "$BASE_URL/api/cal/booking-confirmation" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@email.com",
    "startDateTime": "2025-06-09T14:00:00.000Z",
    "duration": 60,
    "nodeId": "booking-confirmation-node",
    "confirmationStep": "confirm_email"
  }' | jq .

echo ""
echo ""

# Test 9: Final Confirmation (This will attempt actual booking)
echo "9️⃣ Testing Booking Confirmation - Step 5: Final Confirmation..."
echo "⚠️  Note: This will attempt to create a real booking via Cal.com API"
curl -X POST "$BASE_URL/api/cal/booking-confirmation" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@email.com",
    "startDateTime": "2025-06-09T14:00:00.000Z",
    "duration": 60,
    "nodeId": "booking-confirmation-node",
    "confirmationStep": "final_confirmation"
  }' | jq .

echo ""
echo ""

# Test 10: Navigate to Completion
echo "🔟 Testing Navigation to Completion..."
curl -X POST "$BASE_URL/api/flow/navigate" \
  -H "Content-Type: application/json" \
  -H "x-ultravox-call-id: $CALL_ID" \
  -d '{
    "userResponse": "Yes, that is perfect. Thank you!",
    "currentNodeId": "booking-confirmation-node",
    "callId": "'$CALL_ID'"
  }' | jq .

echo ""
echo ""

# Test Summary
echo "✅ Enhanced Cal Integration Test Complete!"
echo ""
echo "🎯 Key Features Tested:"
echo "   • Enhanced availability response formatting for speech"
echo "   • Word-by-word name confirmation"
echo "   • Character-by-character email confirmation"  
echo "   • Step-by-step booking confirmation process"
echo "   • Speech-optimized time and date formatting"
echo "   • Proper transition handling for booking flow"
echo ""
echo "📝 Expected Improvements:"
echo "   • Times spoken as 'two o'clock PM' instead of '2:00 PM'"
echo "   • Dates spoken as 'Monday, January fifteenth' with ordinals"
echo "   • Clear step-by-step confirmation prompts"
echo "   • Accurate data collection for voice interactions"
echo "   • Smooth transitions between booking steps"
echo ""

echo "🔍 Next Steps for Testing:"
echo "   1. Test with actual voice input via UltraVox"
echo "   2. Verify speech formatting sounds natural"
echo "   3. Test error handling for incorrect spellings"
echo "   4. Verify booking confirmations are received"
echo "   5. Test edge cases (invalid emails, missing data)" 
#!/bin/bash

echo "🎯 TESTING SIMPLE CUSTOMER SUPPORT FLOW"
echo "======================================="
echo "Testing Tech vs Billing routing"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m' 
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🎯 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Technical Issue Route
print_test "Test 1: Technical Issue - 'My app is broken'"

tech_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1",
    "callId": "support-test",
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
  }')

if echo "$tech_response" | grep -q "changeStage.*tech-support"; then
    print_success "✅ Technical issue routes to tech-support"
else
    print_warning "⚠️  Technical routing may have issues"
fi

echo ""

# Test 2: Billing Question Route
print_test "Test 2: Billing Question - 'I have an invoice question'"

billing_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1",
    "callId": "support-test",
    "userResponse": "I have a question about my invoice and billing",
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
  }')

if echo "$billing_response" | grep -q "changeStage.*billing-support"; then
    print_success "✅ Billing question routes to billing-support"
else
    print_warning "⚠️  Billing routing may have issues"
fi

echo ""

# Summary
echo "🎯 SIMPLE SUPPORT FLOW RESULTS"
echo "=============================="

tech_works=$(echo "$tech_response" | grep -q "tech-support" && echo "✅" || echo "❌")
billing_works=$(echo "$billing_response" | grep -q "billing-support" && echo "✅" || echo "❌")

echo "   $tech_works Technical issues → tech-support"
echo "   $billing_works Billing questions → billing-support"

echo ""
if [[ "$tech_works" == "✅" && "$billing_works" == "✅" ]]; then
    print_success "🎉 Perfect! Your support routing flow works!"
    echo ""
    echo "🎪 **Now Test Visually:**"
    echo "1. 🌐 Open: http://localhost:3000"
    echo "2. 🏗️  Create the flow with exact configurations from SIMPLE_FLOW_EXAMPLE.md"
    echo "3. 🎤 Start voice call and test:"
    echo "   • Say: 'My app is broken' → Should go to tech-support"
    echo "   • Say: 'I have a billing question' → Should go to billing-support"
    echo "4. 👀 Watch nodes glow blue when active!"
else
    print_warning "🔧 Check the node configurations match the example exactly"
fi 
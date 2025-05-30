#!/bin/bash

echo "🔄 TESTING TRANSITION FLOW EXAMPLE"
echo "=================================="
echo "Testing: start-node → question-node → goodbye-node"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m' 
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${PURPLE}📋 $1${NC}"
}

# Test 1: First Transition (start-node → question-node)
print_test "Test 1: Transition start-node → question-node"
echo "User says: 'What time is it?'"

first_transition=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-node",
    "callId": "transition-flow-test",
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
            "content": "I understand your question. Let me help you with that.",
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
  }')

if echo "$first_transition" | grep -q "changeStage.*question-node"; then
    print_success "✅ First transition works: start-node → question-node"
else
    print_warning "⚠️  First transition may have issues"
    echo "Response: $(echo "$first_transition" | head -c 150)..."
fi

echo ""

# Test 2: Second Transition (question-node → goodbye-node)
print_test "Test 2: Transition question-node → goodbye-node"
echo "User asked a question, AI should move to goodbye after answering"

second_transition=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "question-node",
    "callId": "transition-flow-test",
    "userResponse": "Thank you for the answer",
    "flowData": {
      "nodes": [
        {
          "id": "question-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "Question Handler",
            "content": "I understand your question. Let me help you with that.",
            "customPrompt": "The user has asked a question. Provide a helpful response to their question. After answering, use changeStage to move to goodbye-node."
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
        {"id": "e2", "source": "question-node", "target": "goodbye-node"}
      ]
    }
  }')

if echo "$second_transition" | grep -q "changeStage.*goodbye-node"; then
    print_success "✅ Second transition works: question-node → goodbye-node"
else
    print_warning "⚠️  Second transition may have issues"
    echo "Response: $(echo "$second_transition" | head -c 150)..."
fi

echo ""

# Test 3: Final Node (goodbye-node should NOT transition)
print_test "Test 3: Final node - goodbye-node (should NOT transition)"
echo "Final node should end conversation without more transitions"

final_node=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "goodbye-node",
    "callId": "transition-flow-test",
    "userResponse": "Goodbye!",
    "flowData": {
      "nodes": [
        {
          "id": "goodbye-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "Goodbye",
            "content": "Thank you for your question! Have a great day!",
            "customPrompt": "Say goodbye to the user. This is the end of the conversation, so do not use changeStage."
          }
        }
      ],
      "edges": []
    }
  }')

if echo "$final_node" | grep -q -v "changeStage"; then
    print_success "✅ Final node correctly ends conversation (no changeStage)"
else
    print_warning "⚠️  Final node should not include changeStage"
fi

echo ""

# Summary
echo "🎯 TRANSITION FLOW TEST RESULTS"
echo "==============================="

# Check results
first_ok=$(echo "$first_transition" | grep -q "question-node" && echo "✅" || echo "❌")
second_ok=$(echo "$second_transition" | grep -q "goodbye-node" && echo "✅" || echo "❌")
final_ok=$(echo "$final_node" | grep -q -v "changeStage" && echo "✅" || echo "❌")

echo ""
echo "📊 **Transition Results:**"
echo "   $first_ok Transition 1: start-node → question-node"
echo "   $second_ok Transition 2: question-node → goodbye-node"
echo "   $final_ok Final State: goodbye-node (no more transitions)"

echo ""
if [[ "$first_ok" == "✅" && "$second_ok" == "✅" && "$final_ok" == "✅" ]]; then
    print_success "🎉 PERFECT! All transitions working correctly!"
    echo ""
    echo "✨ **Your Flow is Ready:**"
    echo "   • Linear progression through all nodes"
    echo "   • Proper transition triggers"
    echo "   • Clean conversation ending"
    echo ""
    echo "🎪 **Now Test Visually:**"
    echo "   1. 🌐 Open: http://localhost:3000"
    echo "   2. 🏗️  Create the exact flow from TRANSITION_EXAMPLE.md"
    echo "   3. 🎤 Start voice call and say anything"
    echo "   4. 👀 Watch nodes light up in sequence:"
    echo "      • start-node (blue) → question-node (blue) → goodbye-node (blue)"
    echo "   5. 📝 See stage history: start-node → question-node → goodbye-node"
    echo ""
    print_success "Your transitions are working perfectly! 🚀"
else
    print_warning "🔧 Some transitions need adjustment"
    echo ""
    echo "💡 **Check These:**"
    if [[ "$first_ok" == "❌" ]]; then
        echo "   • First transition: Verify start-node custom prompt mentions 'question-node'"
    fi
    if [[ "$second_ok" == "❌" ]]; then
        echo "   • Second transition: Verify question-node custom prompt mentions 'goodbye-node'"
    fi
    if [[ "$final_ok" == "❌" ]]; then
        echo "   • Final node: Remove changeStage from goodbye-node custom prompt"
    fi
fi

echo ""
echo "🎯 **Expected Visual Flow:**"
echo "========================================="
echo "1. 🗣️  User: 'Hello' → AI: 'How can I help?' [start-node active]"
echo "2. 🗣️  User: 'What time is it?' → [TRANSITION → question-node active]"
echo "3. 🤖 AI: 'I understand your question...' → [TRANSITION → goodbye-node active]"
echo "4. 🤖 AI: 'Thank you! Have a great day!' → [CONVERSATION ENDS]"
echo ""
print_info "📋 Watch for blue glowing nodes and animated edges during transitions!" 
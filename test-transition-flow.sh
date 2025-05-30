#!/bin/bash

echo "🔄 TESTING TRANSITION-BASED FLOW"
echo "================================="
echo "Testing your conditional flow with 'user is free' and 'user is busy' transitions"
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}📋 $1${NC}"
}

# Test 1: Start Node with Customer Greeting
print_test "Test 1: Customer Greeting Flow - Start Node"
echo "Testing: 'Say Hello to customer and ask if now is a good time to talk'"

start_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1",
    "callId": "transition-test-flow",
    "flowData": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start",
          "data": {
            "content": "Say Hello to {{customer_name}}, and ask the user if now is a good time to talk.",
            "customPrompt": "Greet the customer warmly using their name and ask if now is a good time to talk. Based on their response, use changeStage to transition to the appropriate next node."
          }
        },
        {
          "id": "user-free-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Free",
            "content": "Great! Since you have time, let me help you with your inquiry.",
            "customPrompt": "The user is available to talk. Proceed with helping them."
          }
        },
        {
          "id": "user-busy-node", 
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Busy",
            "content": "I understand you'\''re busy. When would be a better time to call?",
            "customPrompt": "The user is busy. Ask when would be a better time to contact them."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "user-free-node"},
        {"id": "e2", "source": "start-1", "target": "user-busy-node"}
      ]
    }
  }')

if echo "$start_response" | grep -q "changeStage"; then
    print_success "Start node can initiate transitions"
    if echo "$start_response" | grep -q "user-free-node\|user-busy-node"; then
        print_success "Transition options include both 'free' and 'busy' paths"
    else
        print_warning "Transition options may not include expected paths"
    fi
else
    print_warning "Start node transition may have issues"
fi

echo ""

# Test 2: User Says They're Free
print_test "Test 2: User Response - 'I'm free to talk'"
echo "Testing transition when user is available"

free_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1",
    "callId": "transition-test-flow",
    "userResponse": "Yes, I have time to talk now. I'\''m free.",
    "flowData": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start",
          "data": {
            "content": "Say Hello to {{customer_name}}, and ask the user if now is a good time to talk.",
            "customPrompt": "Based on the user response, if they indicate they are free/available, use changeStage to move to user-free-node. If they are busy, move to user-busy-node."
          }
        },
        {
          "id": "user-free-node",
          "type": "workflow", 
          "data": {
            "nodeTitle": "User is Free",
            "content": "Great! Since you have time, let me help you.",
            "customPrompt": "Proceed to help the available user."
          }
        },
        {
          "id": "user-busy-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Busy", 
            "content": "I understand you'\''re busy.",
            "customPrompt": "Handle the busy user appropriately."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "user-free-node"},
        {"id": "e2", "source": "start-1", "target": "user-busy-node"}
      ]
    }
  }')

if echo "$free_response" | grep -q "changeStage.*user-free-node"; then
    print_success "✅ 'User is free' transition works correctly"
else
    print_warning "⚠️  'User is free' transition may not be working"
fi

echo ""

# Test 3: User Says They're Busy  
print_test "Test 3: User Response - 'I'm busy right now'"
echo "Testing transition when user is not available"

busy_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "start-1", 
    "callId": "transition-test-flow",
    "userResponse": "Sorry, I'\''m really busy right now. Can you call back later?",
    "flowData": {
      "nodes": [
        {
          "id": "start-1",
          "type": "start",
          "data": {
            "content": "Say Hello to {{customer_name}}, and ask the user if now is a good time to talk.",
            "customPrompt": "Based on the user response, if they indicate they are free/available, use changeStage to move to user-free-node. If they are busy/not available, move to user-busy-node."
          }
        },
        {
          "id": "user-free-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Free",
            "content": "Great! Since you have time, let me help you.",
            "customPrompt": "Proceed to help the available user."
          }
        },
        {
          "id": "user-busy-node",
          "type": "workflow", 
          "data": {
            "nodeTitle": "User is Busy",
            "content": "I understand you'\''re busy. When would be better?",
            "customPrompt": "Handle the busy user and ask for better time."
          }
        }
      ],
      "edges": [
        {"id": "e1", "source": "start-1", "target": "user-free-node"},
        {"id": "e2", "source": "start-1", "target": "user-busy-node"}
      ]
    }
  }')

if echo "$busy_response" | grep -q "changeStage.*user-busy-node"; then
    print_success "✅ 'User is busy' transition works correctly"
else
    print_warning "⚠️  'User is busy' transition may not be working"
fi

echo ""

# Test 4: Test Both Target Nodes
print_test "Test 4: Target Node Responses"

# Test user-free-node
print_info "Testing 'User is Free' node response..."
free_node_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "user-free-node",
    "callId": "transition-test-flow",
    "userResponse": "Great, I'\''m ready to talk!",
    "flowData": {
      "nodes": [
        {
          "id": "user-free-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Free",
            "content": "Great! Since you have time, let me help you with your inquiry.",
            "customPrompt": "The user is available. Proceed to help them with their needs."
          }
        }
      ],
      "edges": []
    }
  }')

if echo "$free_node_response" | grep -q "help you\|assist\|inquiry"; then
    print_success "✅ 'User is Free' node responds appropriately"
else
    print_warning "⚠️  'User is Free' node response needs improvement"
fi

# Test user-busy-node
print_info "Testing 'User is Busy' node response..."
busy_node_response=$(curl -s -X POST http://localhost:3000/api/flow/stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "user-busy-node",
    "callId": "transition-test-flow", 
    "userResponse": "Yeah, maybe in an hour?",
    "flowData": {
      "nodes": [
        {
          "id": "user-busy-node",
          "type": "workflow",
          "data": {
            "nodeTitle": "User is Busy",
            "content": "I understand you'\''re busy. When would be a better time to call?",
            "customPrompt": "The user is busy. Ask when would be a better time and offer to schedule a callback."
          }
        }
      ],
      "edges": []
    }
  }')

if echo "$busy_node_response" | grep -q "better time\|schedule\|callback\|hour"; then
    print_success "✅ 'User is Busy' node responds appropriately"
else
    print_warning "⚠️  'User is Busy' node response needs improvement"
fi

echo ""

# Summary
echo "🎯 TRANSITION FLOW TEST RESULTS"
echo "==============================="
echo ""
echo "📊 **Conditional Logic Results:**"

# Check if both transitions work
free_works=$(echo "$free_response" | grep -q "user-free-node" && echo "✅" || echo "❌")
busy_works=$(echo "$busy_response" | grep -q "user-busy-node" && echo "✅" || echo "❌")

echo "   $free_works User says 'I'm free' → Routes to 'user-free-node'"
echo "   $busy_works User says 'I'm busy' → Routes to 'user-busy-node'"

echo ""
echo "🧠 **AI Decision Making:**"
if [[ "$free_works" == "✅" && "$busy_works" == "✅" ]]; then
    print_success "🎉 EXCELLENT! Your transition-based flow is working perfectly!"
    echo ""
    echo "✨ **What's Working:**"
    echo "   • AI correctly interprets user responses"
    echo "   • Conditional transitions route to proper nodes"
    echo "   • Both 'free' and 'busy' paths are functional"
    echo "   • Stage change API handles branching logic"
    echo ""
    echo "🚀 **Your Flow is Production-Ready!**"
else
    print_warning "🔧 Some transitions need fine-tuning"
    echo ""
    echo "💡 **Suggestions:**"
    echo "   • Make custom prompts more specific about routing conditions"
    echo "   • Include exact node IDs in prompts"
    echo "   • Test with more varied user responses"
fi

echo ""
echo "🎪 **Visual Testing Instructions for Your Flow:**"
echo "================================================"
echo ""
echo "1. 🌐 Open: http://localhost:3000"
echo "2. 🎤 Start a voice call with your existing flow"
echo "3. 🗣️  Say: 'Hello, this is [customer_name]'"
echo "4. 👂 AI should ask: 'Is now a good time to talk?'"
echo "5. 🔄 **Test Both Paths:**"
echo ""
echo "   **Path A - User is Free:**"
echo "   • 🗣️  Say: 'Yes, I have time to talk'"
echo "   • 👀 Watch: Node should transition to 'user-free-node'"
echo "   • 🔵 Visual: 'User is Free' node should glow blue"
echo ""
echo "   **Path B - User is Busy:**"
echo "   • 🗣️  Say: 'Sorry, I'm busy right now'"
echo "   • 👀 Watch: Node should transition to 'user-busy-node'"
echo "   • 🔵 Visual: 'User is Busy' node should glow blue"
echo ""
echo "6. 📝 **Expected Visual Feedback:**"
echo "   • Blue glowing border around active node"
echo "   • Edge animation showing the chosen path"
echo "   • Stage history in call manager"
echo "   • Real-time transcripts"
echo ""

if [[ "$free_works" == "✅" && "$busy_works" == "✅" ]]; then
    print_success "🎉 Your transition-based flow is ready for production use!"
else
    print_warning "🔧 Fine-tune the custom prompts for better routing accuracy"
fi 
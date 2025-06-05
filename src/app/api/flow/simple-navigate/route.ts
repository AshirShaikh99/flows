import { NextRequest, NextResponse } from 'next/server';
import { getFlowData, storeFlowData } from '../shared-flow-data';

// DEPRECATED: This endpoint is being replaced by the proper Ultravox Call Stages API
// Use the 'changeStage' tool which calls /api/flow/change-stage instead
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    console.log('🚀 SIMPLE Navigate called (DEPRECATED):', requestData);
    console.log('⚠️ This endpoint is deprecated. Please use the changeStage tool instead.');

    const { userResponse, currentNodeId, callId } = requestData;

    console.log('📞 Call ID from request body:', callId);
    console.log('🎯 Current node:', currentNodeId);
    console.log('💬 User response:', userResponse);

    if (!callId) {
      console.error('❌ No call ID provided in request body');
      return NextResponse.json({
        toolResultText: 'Cannot navigate without call ID. Please use the changeStage tool for proper navigation.',
        success: false,
        deprecationWarning: 'This endpoint is deprecated. Use the changeStage tool for proper Ultravox Call Stages support.'
      });
    }

    // Get flow data using shared storage
    let flowData = getFlowData(callId);
    
    // Try to resolve call ID using placeholder mapping
    if (!flowData) {
      console.log('🔍 Trying placeholder call ID mapping...');
      const placeholderCallId = 'call-1234567890';
      flowData = getFlowData(placeholderCallId);
      
      if (flowData) {
        console.log('✅ Found flow data using placeholder mapping');
      }
    }
    
    if (!flowData) {
      // Try to fetch from UltraVox API as fallback
      try {
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
            // Store using shared storage for future use
            storeFlowData(callId, flowData);
            console.log('✅ Retrieved and cached flow data from UltraVox');
          }
        }
      } catch (error) {
        console.error('❌ Error fetching flow data:', error);
      }
    }

    if (!flowData) {
      console.error('❌ No flow data available');
      return NextResponse.json({
        toolResultText: 'No flow data available for navigation. Please ensure the call is properly initialized with Call Stages support.',
        success: false,
        deprecationWarning: 'This endpoint is deprecated. Use the changeStage tool for proper Ultravox Call Stages support.',
        recommendation: 'Please use the changeStage tool which provides proper Ultravox Call Stages integration.'
      });
    }

    // Find next node based on current node and user response
    const nextNodeId = determineNextNode(flowData, currentNodeId, userResponse);
    
    if (!nextNodeId) {
      console.log('🏁 End of flow reached');
      return NextResponse.json({
        toolResultText: 'Thank you! That completes our conversation.',
        success: true,
        endOfFlow: true,
        deprecationWarning: 'This endpoint is deprecated. Future flows should use the changeStage tool for proper Ultravox Call Stages support.'
      });
    }

    const nextNode = flowData.nodes.find((n: any) => n.id === nextNodeId);
    
    console.log('✅ SUCCESSFUL NAVIGATION (via deprecated endpoint)!', {
      from: currentNodeId,
      to: nextNodeId,
      nodeType: nextNode?.type,
      hasCustomPrompt: !!nextNode?.data?.customPrompt
    });

    // Return a response that suggests using the proper call stages API
    return NextResponse.json({
      toolResultText: `Successfully moved to ${nextNode?.type} node: ${nextNode?.data?.customPrompt || nextNode?.data?.content || 'Processing...'}. Note: For better conversation flow management, consider using Ultravox Call Stages with the changeStage tool.`,
      success: true,
      callId: callId,
      nextNodeId: nextNodeId,
      metadata: {
        nodeId: nextNodeId,
        userResponse,
        previousNodeId: currentNodeId,
        nodeType: nextNode?.type
      },
      deprecationWarning: 'This endpoint is deprecated. Please use the changeStage tool for proper Ultravox Call Stages support.',
      migration: {
        newEndpoint: '/api/flow/change-stage',
        toolName: 'changeStage',
        description: 'Use the changeStage tool for proper Ultravox Call Stages integration with better state management.'
      }
    });

  } catch (error) {
    console.error('❌ Request parsing error:', error);
    return NextResponse.json(
      { 
        error: 'Invalid request format',
        toolResultText: 'Unable to process navigation request. Please use the changeStage tool for proper Ultravox Call Stages support.',
        deprecationWarning: 'This endpoint is deprecated.'
      },
      { status: 400 }
    );
  }
}

// Enhanced flow navigation logic with better transition matching
function determineNextNode(flowData: any, currentNodeId: string, userResponse?: string): string | null {
  console.log('🔍 Determining next node from:', currentNodeId, 'with response:', userResponse);

  const currentNode = flowData.nodes.find((n: any) => n.id === currentNodeId);
  if (!currentNode) {
    console.error('❌ Current node not found:', currentNodeId);
    return null;
  }

  // Find outgoing edges from current node
  const outgoingEdges = flowData.edges.filter((edge: any) => edge.source === currentNodeId);
  console.log('🔗 Found', outgoingEdges.length, 'outgoing edges');

  if (outgoingEdges.length === 0) {
    console.log('🏁 No outgoing edges found - end of flow');
    return null;
  }

  // Enhanced logic for workflow nodes with transitions
  if (currentNode.type === 'workflow' && currentNode.data?.transitions && userResponse) {
    const responseText = userResponse.toLowerCase().trim();
    
    // Match user response to transitions with improved logic
    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const transition = currentNode.data.transitions[i];
      
      if (transition?.label) {
        const transitionLabel = transition.label.toLowerCase();
        
        // Enhanced matching logic
        if (isResponseMatch(responseText, transitionLabel)) {
          console.log('✅ Matched response to transition:', transition.label);
          return edge.target;
        }
      }
    }
    
    // If no specific match, use first edge as fallback
    console.log('⚠️ No specific match found, using first edge');
    return outgoingEdges[0]?.target || null;
  }

  // Enhanced logic for Cal nodes with transitions
  if ((currentNode.type === 'cal_check_availability' || currentNode.type === 'cal_book_appointment') && currentNode.data?.transitions && userResponse) {
    const responseText = userResponse.toLowerCase().trim();
    
    // Match user response to transitions with improved logic
    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const transition = currentNode.data.transitions[i];
      
      if (transition?.label) {
        const transitionLabel = transition.label.toLowerCase();
        
        // Enhanced matching logic for Cal nodes
        if (isCalResponseMatch(responseText, transitionLabel, currentNode.type)) {
          console.log('✅ Matched response to Cal transition:', transition.label);
          return edge.target;
        }
      }
    }
    
    // If no specific match, use first edge as fallback
    console.log('⚠️ No specific match found for Cal node, using first edge');
    return outgoingEdges[0]?.target || null;
  }

  // Default: use first edge
  console.log('➡️ Using first edge for node type:', currentNode.type);
  return outgoingEdges[0]?.target || null;
}

function isResponseMatch(userResponse: string, transitionLabel: string): boolean {
  // Positive responses
  if ((userResponse.includes('yes') || userResponse.includes('want') || userResponse.includes('interested') || userResponse.includes('learn')) &&
      (transitionLabel.includes('yes') || transitionLabel.includes('want') || transitionLabel.includes('learn'))) {
    return true;
  }
  
  // Negative responses
  if ((userResponse.includes('no') || userResponse.includes('not') || userResponse.includes('busy')) &&
      (transitionLabel.includes('no') || transitionLabel.includes('busy') || transitionLabel.includes('not'))) {
    return true;
  }
  
  // Medical/surgery related
  if ((userResponse.includes('surgery') || userResponse.includes('operation') || userResponse.includes('medical')) &&
      (transitionLabel.includes('surgery') || transitionLabel.includes('medical'))) {
    return true;
  }
  
  // Transfer/agent requests
  if ((userResponse.includes('agent') || userResponse.includes('human') || userResponse.includes('transfer')) &&
      (transitionLabel.includes('agent') || transitionLabel.includes('transfer'))) {
    return true;
  }
  
  // Reschedule requests
  if ((userResponse.includes('reschedule') || userResponse.includes('change') || userResponse.includes('appointment')) &&
      (transitionLabel.includes('reschedule') || transitionLabel.includes('appointment'))) {
    return true;
  }
  
  return false;
}

function isCalResponseMatch(userResponse: string, transitionLabel: string, nodeType: string): boolean {
  if (nodeType === 'cal_check_availability') {
    // Check availability node transitions
    if ((userResponse.includes('book') || userResponse.includes('schedule') || userResponse.includes('yes') || userResponse.includes('confirm') || userResponse.includes('perfect')) &&
        (transitionLabel.includes('book') || transitionLabel.includes('schedule') || transitionLabel.includes('appointment'))) {
      return true;
    }
    if ((userResponse.includes('later') || userResponse.includes('no') || userResponse.includes('not now') || userResponse.includes('different time')) &&
        (transitionLabel.includes('later') || transitionLabel.includes('no') || transitionLabel.includes('different'))) {
      return true;
    }
  }
  
  if (nodeType === 'cal_book_appointment') {
    // Book appointment node transitions
    if ((userResponse.includes('confirm') || userResponse.includes('yes') || userResponse.includes('book') || userResponse.includes('proceed')) &&
        (transitionLabel.includes('confirm') || transitionLabel.includes('book') || transitionLabel.includes('proceed'))) {
      return true;
    }
    if ((userResponse.includes('cancel') || userResponse.includes('no') || userResponse.includes('not') || userResponse.includes('different')) &&
        (transitionLabel.includes('cancel') || transitionLabel.includes('no') || transitionLabel.includes('different'))) {
      return true;
    }
  }
  
  // Fallback to general matching
  return isResponseMatch(userResponse, transitionLabel);
} 
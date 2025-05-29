import { NextRequest, NextResponse } from 'next/server';
import { getFlowData, storeFlowData } from '../shared-flow-data';

// Simplified flow navigation that works with UltraVox Call Stages
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    console.log('🚀 SIMPLE Navigate called:', requestData);

    const { userResponse, currentNodeId, callId } = requestData;

    console.log('📞 Call ID from request body:', callId);
    console.log('🎯 Current node:', currentNodeId);
    console.log('💬 User response:', userResponse);

    if (!callId) {
      console.error('❌ No call ID provided in request body');
      return NextResponse.json({
        toolResultText: 'Cannot navigate without call ID',
        success: false
      });
    }

    // Get flow data using shared storage
    let flowData = getFlowData(callId);
    
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
        toolResultText: 'No flow data available for navigation',
        success: false
      });
    }

    // Find next node based on current node and user response
    const nextNodeId = determineNextNode(flowData, currentNodeId, userResponse);
    
    if (!nextNodeId) {
      console.log('🏁 End of flow reached');
      return NextResponse.json({
        toolResultText: 'Thank you! That completes our conversation.',
        success: true,
        endOfFlow: true
      });
    }

    const nextNode = flowData.nodes.find((n: any) => n.id === nextNodeId);
    
    console.log('✅ SUCCESSFUL NAVIGATION!', {
      from: currentNodeId,
      to: nextNodeId,
      nodeType: nextNode?.type,
      hasCustomPrompt: !!nextNode?.data?.customPrompt
    });

    return NextResponse.json({
      toolResultText: `Successfully moved to ${nextNode?.type} node: ${nextNode?.data?.customPrompt || nextNode?.data?.content || 'Processing...'}`,
      success: true,
      callId: callId,
      nextNodeId: nextNodeId,
      metadata: {
        nodeId: nextNodeId,
        userResponse,
        previousNodeId: currentNodeId,
        nodeType: nextNode?.type
      }
    });

  } catch (error) {
    console.error('❌ Request parsing error:', error);
    return NextResponse.json(
      { 
        error: 'Invalid request format',
        toolResultText: 'Unable to process navigation request'
      },
      { status: 400 }
    );
  }
}

// Simple flow navigation logic
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

  // Simple logic: for workflow nodes with transitions, match user response
  if (currentNode.type === 'workflow' && currentNode.data?.transitions && userResponse) {
    const responseText = userResponse.toLowerCase().trim();
    
    // Match user response to transitions
    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i];
      const transition = currentNode.data.transitions[i];
      
      if (transition?.label) {
        const transitionLabel = transition.label.toLowerCase();
        
        // Check for matches
        if ((responseText.includes('yes') || responseText.includes('interested')) && 
            (transitionLabel.includes('free') || i === 0)) {
          console.log('✅ Matched positive response to transition:', transition.label);
          return edge.target;
        }
        if ((responseText.includes('no') || responseText.includes('not')) && 
            (transitionLabel.includes('busy') || i === 1)) {
          console.log('✅ Matched negative response to transition:', transition.label);
          return edge.target;
        }
      }
    }
  }

  // Default: use first edge
  console.log('⚠️ Using default first edge');
  return outgoingEdges[0]?.target || null;
} 
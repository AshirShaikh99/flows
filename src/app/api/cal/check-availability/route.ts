import { NextRequest, NextResponse } from 'next/server';
import { CalService } from '../../../../lib/cal-service';
import { FlowData, FlowNode } from '../../../../types';
import { getFlowData } from '../../flow/shared-flow-data';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, nodeId, callId } = await request.json();

    console.log('🗓️ Check availability request:', { startDate, endDate, nodeId, callId });

    // Validate required parameters
    if (!startDate) {
      return NextResponse.json(
        { error: 'startDate is required' },
        { status: 400 }
      );
    }

    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId is required' },
        { status: 400 }
      );
    }

    // Get node configuration from the stored flow data
    // Try to get call ID from multiple sources
    const effectiveCallId = callId || 
                           request.headers.get('x-call-id') || 
                           request.headers.get('call-id') ||
                           request.headers.get('ultravox-call-id');
    
    console.log('🔍 Attempting to find flow data with call ID:', effectiveCallId);
    
    const flowData = getStoredFlowData(effectiveCallId);
    
    if (!flowData) {
      return NextResponse.json(
        { 
          error: 'Flow data not found',
          responseText: "I'm sorry, I'm having trouble accessing the calendar configuration. Please contact support."
        },
        { status: 500 }
      );
    }
    
    const node = flowData.nodes.find((n: FlowNode) => n.id === nodeId);

    if (!node || (node.type !== 'cal_check_availability')) {
      return NextResponse.json(
        { 
          error: 'Invalid node or node type for availability check',
          responseText: "I'm sorry, there's a configuration issue with the calendar function. Please contact support."
        },
        { status: 400 }
      );
    }

    // Validate Cal.com configuration
    const calApiKey = node.data.calApiKey;
    const calEventTypeId = node.data.calEventTypeId;
    const calTimezone = node.data.calTimezone || 'America/Los_Angeles';

    if (!calApiKey || !calEventTypeId) {
      return NextResponse.json(
        { 
          error: 'Cal.com API key and Event Type ID must be configured for this node',
          responseText: "I'm sorry, the calendar integration isn't properly configured. Please contact support to complete the setup."
        },
        { status: 400 }
      );
    }

    // Validate API key format (basic check)
    if (typeof calApiKey !== 'string' || calApiKey.trim().length < 10) {
      return NextResponse.json(
        { 
          error: 'Invalid Cal.com API key format',
          responseText: "I'm sorry, there's an issue with the calendar configuration. Please contact support."
        },
        { status: 400 }
      );
    }

    // Validate Event Type ID format
    if (typeof calEventTypeId !== 'string' || !/^\d+$/.test(calEventTypeId.trim())) {
      return NextResponse.json(
        { 
          error: 'Invalid Cal.com Event Type ID format',
          responseText: "I'm sorry, there's an issue with the calendar event configuration. Please contact support."
        },
        { status: 400 }
      );
    }

    // Initialize Cal.com service
    const calService = new CalService({
      apiKey: calApiKey,
      eventTypeId: calEventTypeId,
      timezone: calTimezone
    });

    // Check availability
    const endDateParam = endDate || startDate;
    
    try {
      const availabilitySlots = await calService.checkAvailability(startDate, endDateParam);

      // Format response for the agent
      const responseText = calService.formatAvailabilityResponse(availabilitySlots);

      console.log('✅ Availability check completed:', { 
        slotsFound: availabilitySlots.length,
        availableSlots: availabilitySlots.filter(s => s.available).length
      });

      return NextResponse.json({
        success: true,
        availability: availabilitySlots,
        responseText: responseText,
        metadata: {
          nodeId: nodeId,
          requestedDate: startDate,
          timezone: calTimezone
        }
      });

    } catch (error) {
      console.error('❌ Error checking availability:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = "I'm sorry, I'm having trouble checking the calendar availability right now. ";
      
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        userFriendlyMessage += "There seems to be an authentication issue with the calendar service. Please contact support.";
      } else if (errorMessage.includes('404')) {
        userFriendlyMessage += "The calendar event type was not found. Please contact support to verify the configuration.";
      } else if (errorMessage.includes('rate limit')) {
        userFriendlyMessage += "The calendar service is temporarily busy. Please try again in a few minutes.";
      } else {
        userFriendlyMessage += "Please try again in a moment or contact support if the issue persists.";
      }

      return NextResponse.json(
        { 
          error: 'Failed to check availability',
          details: errorMessage,
          responseText: userFriendlyMessage
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in check-availability endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        responseText: "I'm sorry, I encountered an error while checking availability. Please try again."
      },
      { status: 500 }
    );
  }
}

// Helper function to get stored flow data
// Uses the shared flow data storage system
function getStoredFlowData(preferredCallId?: string) {
  try {
    // If we have a specific call ID, try that first
    if (preferredCallId) {
      console.log('🔍 Trying preferred call ID:', preferredCallId);
      const flowData = getFlowData(preferredCallId);
      if (flowData) {
        console.log('✅ Found flow data for preferred call ID:', preferredCallId);
        return flowData;
      }
    }
    
    // Fallback: Try common patterns for demo/testing
    const fallbackPatterns = [
      'dentist-demo-123', 
      'test-call-123', 
      'call-1234567890'
    ];
    
    for (const callId of fallbackPatterns) {
      const flowData = getFlowData(callId);
      if (flowData) {
        console.log('✅ Found flow data for fallback call ID:', callId);
        return flowData;
      }
    }
    
    console.log('❌ No flow data found for any call IDs');
    return null;
  } catch (error) {
    console.error('Error retrieving flow data:', error);
    return null;
  }
} 
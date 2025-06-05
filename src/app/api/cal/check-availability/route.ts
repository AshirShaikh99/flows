import { NextRequest, NextResponse } from 'next/server';
import { CalService } from '../../../../lib/cal-service';
import { FlowData, FlowNode } from '../../../../types';
import { getFlowData } from '../../flow/shared-flow-data';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, nodeId } = await request.json();

    // Try to get call ID from UltraVox headers
    const callId = request.headers.get('x-ultravox-call-id') || 
                   request.headers.get('ultravox-call-id') ||
                   request.headers.get('x-call-id') ||
                   request.headers.get('call-id');

    console.log('🗓️ Check availability request:', { startDate, endDate, nodeId });
    console.log('🔍 Call ID from headers:', callId);
    console.log('📋 All headers:', Object.fromEntries(request.headers.entries()));

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

    if (!callId) {
      return NextResponse.json(
        { 
          error: 'Call ID not found in headers. Unable to retrieve flow data.',
          responseText: "I'm sorry, I'm having trouble accessing the session information. Please contact support."
        },
        { status: 400 }
      );
    }

    // Get node configuration from the stored flow data using real call ID only
    console.log('🔍 Looking for flow data with call ID:', callId);
    
    let flowData = getStoredFlowData(callId);
    
    // Fallback: Try to fetch from UltraVox API if not found in memory
    if (!flowData) {
      console.log('🔄 Flow data not found in memory, trying UltraVox API...');
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
            console.log('✅ Retrieved flow data from UltraVox API');
          }
        } else {
          console.log('⚠️ Could not fetch call data from UltraVox API:', callResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching flow data from UltraVox API:', error);
      }
    }
    
    if (!flowData) {
      console.error('❌ No flow data found for call:', callId);
      return NextResponse.json(
        { 
          error: 'Flow data not found',
          responseText: "I'm sorry, I'm having trouble accessing the calendar configuration. Please make sure the call is properly initialized with flow data. You can try asking for availability again in a moment."
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
function getStoredFlowData(callId?: string) {
  try {
    if (!callId) {
      console.log('❌ No call ID provided for flow data retrieval');
      return null;
    }
    
    console.log('🔍 Looking for flow data with call ID:', callId);
    const flowData = getFlowData(callId);
    
    if (flowData) {
      console.log('✅ Found flow data for call ID:', callId);
      return flowData;
    } else {
      console.log('❌ No flow data found for call ID:', callId);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving flow data:', error);
    return null;
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { CalService } from '../../../../lib/cal-service';
import { FlowData, FlowNode } from '../../../../types';
import { getFlowData } from '../../flow/shared-flow-data';

export async function POST(request: NextRequest) {
  try {
    const { name, email, startDateTime, duration = 60, nodeId } = await request.json();

    // Try to get call ID from UltraVox headers
    const callId = request.headers.get('x-ultravox-call-id') || 
                   request.headers.get('ultravox-call-id') ||
                   request.headers.get('x-call-id') ||
                   request.headers.get('call-id');

    console.log('📅 Book appointment request:', { name, email, startDateTime, duration, nodeId });
    console.log('🔍 Call ID from headers:', callId);
    console.log('📋 All headers:', Object.fromEntries(request.headers.entries()));

    // Validate required parameters
    if (!name || !email || !startDateTime || !nodeId) {
      return NextResponse.json(
        { error: 'name, email, startDateTime, and nodeId are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
    
    const flowData = getStoredFlowData(callId);
    
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

    if (!node || (node.type !== 'cal_book_appointment')) {
      return NextResponse.json(
        { 
          error: 'Invalid node or node type for appointment booking',
          responseText: "I'm sorry, there's a configuration issue with the booking function. Please contact support."
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

    // Calculate end time
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));

    // Prepare booking data
    const bookingData = {
      name,
      email,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      eventTypeId: calEventTypeId,
      timeZone: calTimezone,
      metadata: {
        nodeId: nodeId,
        duration: duration
      }
    };

    try {
      const bookingResponse = await calService.bookAppointment(bookingData);

      // Format response for the agent
      const responseText = calService.formatBookingResponse(bookingResponse);

      console.log('✅ Appointment booking completed:', {
        bookingId: bookingResponse.id || bookingResponse.uid,
        customerName: name,
        customerEmail: email,
        appointmentTime: startDateTime
      });

      return NextResponse.json({
        success: true,
        booking: bookingResponse,
        responseText: responseText,
        metadata: {
          nodeId: nodeId,
          customerName: name,
          customerEmail: email,
          appointmentTime: startDateTime,
          duration: duration,
          timezone: calTimezone
        }
      });

    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = "I'm sorry, I encountered an issue while booking your appointment. ";
      
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        userFriendlyMessage += "There seems to be an authentication issue with the calendar service. Please contact support.";
      } else if (errorMessage.includes('404')) {
        userFriendlyMessage += "The calendar event type was not found. Please contact support to verify the configuration.";
      } else if (errorMessage.includes('time slot is not available') || errorMessage.includes('conflict')) {
        userFriendlyMessage += "It looks like that time slot is no longer available. Would you like me to check for other available times?";
      } else if (errorMessage.includes('invalid email') || errorMessage.includes('email')) {
        userFriendlyMessage += "There seems to be an issue with the email address. Could you please double-check and provide it again?";
      } else if (errorMessage.includes('rate limit')) {
        userFriendlyMessage += "The calendar service is temporarily busy. Please try again in a few minutes.";
      } else {
        userFriendlyMessage += "Please try again or contact support if the issue persists.";
      }

      return NextResponse.json(
        { 
          error: 'Failed to book appointment',
          details: errorMessage,
          responseText: userFriendlyMessage
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in book-appointment endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        responseText: "I'm sorry, I encountered an error while trying to book your appointment. Please try again."
      },
      { status: 500 }
    );
  }
}

// Helper function to get stored flow data
// Uses the shared flow data storage system
function getStoredFlowData(callId?: string): FlowData | null {
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
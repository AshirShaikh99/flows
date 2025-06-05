import { NextRequest, NextResponse } from 'next/server';
import { CalService } from '../../../../lib/cal-service';
import { FlowData, FlowNode } from '../../../../types';
import { getFlowData } from '../../flow/shared-flow-data';

export async function POST(request: NextRequest) {
  try {
    const { name, email, startDateTime, duration = 60, nodeId, confirmationStep = 'collect' } = await request.json();

    // Try to get call ID from UltraVox headers
    const callId = request.headers.get('x-ultravox-call-id') || 
                   request.headers.get('ultravox-call-id') ||
                   request.headers.get('x-call-id') ||
                   request.headers.get('call-id');

    console.log('📋 Booking confirmation request:', { name, email, startDateTime, duration, nodeId, confirmationStep });
    console.log('🔍 Call ID from headers:', callId);

    // Validate required parameters based on confirmation step
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

    // Get node configuration from the stored flow data
    console.log('🔍 Looking for flow data with call ID:', callId);
    
    const flowData = getStoredFlowData(callId);
    
    if (!flowData) {
      return NextResponse.json(
        { 
          error: 'Flow data not found',
          responseText: "I'm sorry, I'm having trouble accessing the booking configuration. Please contact support."
        },
        { status: 500 }
      );
    }
    
    const node = flowData.nodes.find((n: FlowNode) => n.id === nodeId);

    if (!node || (node.type !== 'cal_booking_confirmation')) {
      return NextResponse.json(
        { 
          error: 'Invalid node or node type for booking confirmation',
          responseText: "I'm sorry, there's a configuration issue with the booking confirmation. Please contact support."
        },
        { status: 400 }
      );
    }

    // Handle different confirmation steps
    switch (confirmationStep) {
      case 'collect':
        return NextResponse.json({
          success: true,
          responseText: "Perfect! I'd be happy to book that appointment for you. To confirm your booking, I'll need to get your details. Let's start with your full name. Could you please spell out your first name for me, letter by letter?",
          nextStep: 'confirm_first_name',
          metadata: {
            nodeId: nodeId,
            appointmentTime: startDateTime,
            duration: duration
          }
        });

      case 'confirm_first_name':
        if (!name) {
          return NextResponse.json({
            success: true,
            responseText: "I didn't catch your first name. Could you please spell out your first name for me, letter by letter?",
            nextStep: 'confirm_first_name',
            metadata: { nodeId, appointmentTime: startDateTime, duration }
          });
        }
        return NextResponse.json({
          success: true,
          responseText: `Thank you! I have your first name as ${name}. Now could you please spell out your last name for me, letter by letter?`,
          nextStep: 'confirm_last_name',
          metadata: { 
            nodeId, 
            firstName: name, 
            appointmentTime: startDateTime, 
            duration 
          }
        });

      case 'confirm_last_name':
        if (!name) {
          return NextResponse.json({
            success: true,
            responseText: "I didn't catch your last name. Could you please spell out your last name for me, letter by letter?",
            nextStep: 'confirm_last_name',
            metadata: { nodeId, appointmentTime: startDateTime, duration }
          });
        }
        return NextResponse.json({
          success: true,
          responseText: `Great! Now I need your email address. Could you please spell out your email address for me, character by character? For example, if your email is john@gmail.com, you would say: J-O-H-N at sign G-M-A-I-L dot C-O-M.`,
          nextStep: 'confirm_email',
          metadata: { 
            nodeId, 
            fullName: name, 
            appointmentTime: startDateTime, 
            duration 
          }
        });

      case 'confirm_email':
        if (!email) {
          return NextResponse.json({
            success: true,
            responseText: "I didn't catch your email address. Could you please spell out your email address for me, character by character? For example, J-O-H-N at sign G-M-A-I-L dot C-O-M.",
            nextStep: 'confirm_email',
            metadata: { nodeId, appointmentTime: startDateTime, duration }
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json({
            success: true,
            responseText: "I'm sorry, that doesn't seem to be a valid email format. Could you please spell out your email address again, character by character? Remember to say 'at sign' for @ and 'dot' for periods.",
            nextStep: 'confirm_email',
            metadata: { nodeId, appointmentTime: startDateTime, duration }
          });
        }

        return NextResponse.json({
          success: true,
          responseText: `Perfect! Let me confirm your details: Your name is ${name}, and your email is ${email}. Your appointment is scheduled for ${new Date(startDateTime).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} at ${new Date(startDateTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}. Is this information correct? Please say yes to confirm and book your appointment, or no if you need to make any changes.`,
          nextStep: 'final_confirmation',
          metadata: { 
            nodeId, 
            fullName: name, 
            email: email,
            appointmentTime: startDateTime, 
            duration 
          }
        });

      case 'final_confirmation':
        if (!name || !email || !startDateTime) {
          return NextResponse.json(
            { error: 'name, email, and startDateTime are required for final booking' },
            { status: 400 }
          );
        }

        // Get Cal.com configuration
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

        // Initialize Cal.com service and book the appointment
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
            duration: duration,
            confirmedViaVoice: true
          }
        };

        try {
          const bookingResponse = await calService.bookAppointment(bookingData);

          // Format response for the agent
          const responseText = `Excellent! Your appointment has been successfully booked. Here are your confirmation details:

Your appointment is confirmed for ${new Date(startDateTime).toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} at ${new Date(startDateTime).toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit',
  hour12: true 
})}.

Your confirmation number is ${bookingResponse.uid}.

A confirmation email will be sent to ${email} shortly.

Is there anything else I can help you with today?`;

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
            nextStep: 'completed',
            metadata: {
              nodeId: nodeId,
              customerName: name,
              customerEmail: email,
              appointmentTime: startDateTime,
              duration: duration,
              timezone: calTimezone,
              bookingId: bookingResponse.uid
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

      default:
        return NextResponse.json(
          { error: 'Invalid confirmation step' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Error in booking-confirmation endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        responseText: "I'm sorry, I encountered an error while processing your booking confirmation. Please try again."
      },
      { status: 500 }
    );
  }
}

// Helper function to get stored flow data (copied from shared-flow-data.ts)
function getStoredFlowData(callId: string): FlowData | null {
  try {
    const { getFlowData } = require('../../flow/shared-flow-data');
    return getFlowData(callId);
  } catch (error) {
    console.error('Error getting stored flow data:', error);
    return null;
  }
} 
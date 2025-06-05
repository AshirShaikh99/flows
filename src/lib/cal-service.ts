interface CalConfig {
  apiKey: string;
  eventTypeId: string;
  timezone: string;
}

interface AvailabilitySlot {
  time: string;
  date: string;
  available: boolean;
}

interface BookingData {
  name: string;
  email: string;
  start: string;
  end: string;
  eventTypeId: string;
  timeZone: string;
  metadata?: Record<string, any>;
}

interface BookingResponse {
  id: string;
  uid: string;
  title: string;
  start: string;
  end: string;
  status: string;
}

export class CalService {
  private config: CalConfig;

  constructor(config: CalConfig) {
    this.config = config;
  }

  /**
   * Check calendar availability for a specific date range
   */
  async checkAvailability(
    startDate: string,
    endDate: string
  ): Promise<AvailabilitySlot[]> {
    if (!this.config.apiKey || !this.config.eventTypeId) {
      throw new Error('Cal.com API key and Event Type ID are required');
    }

    try {
      // Convert date strings to ISO format for Cal.com v2 API
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate + 'T23:59:59').toISOString();

      const response = await fetch(
        `https://api.cal.com/v2/slots/available?eventTypeId=${this.config.eventTypeId}&startTime=${startISO}&endTime=${endISO}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error?.message || response.statusText;
        throw new Error(`Cal.com API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      // Transform Cal.com v2 response to our format
      return this.transformV2AvailabilityData(data);
    } catch (error) {
      console.error('Error checking availability:', error);
      if (error instanceof Error) {
        // Re-throw with additional context
        throw new Error(`Failed to check calendar availability: ${error.message}`);
      }
      throw new Error('Failed to check calendar availability: Unknown error');
    }
  }

  /**
   * Book an appointment
   */
  async bookAppointment(bookingData: BookingData): Promise<BookingResponse> {
    if (!this.config.apiKey || !this.config.eventTypeId) {
      throw new Error('Cal.com API key and Event Type ID are required');
    }

    try {
      const response = await fetch(
        `https://api.cal.com/v2/bookings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventTypeId: parseInt(this.config.eventTypeId),
            start: bookingData.start,
            end: bookingData.end,
            attendee: {
              name: bookingData.name,
              email: bookingData.email,
            },
            metadata: bookingData.metadata || {},
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Cal.com booking error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error booking appointment:', error);
      if (error instanceof Error) {
        // Re-throw with additional context
        throw new Error(`Failed to book appointment: ${error.message}`);
      }
      throw new Error('Failed to book appointment: Unknown error');
    }
  }

  /**
   * Get event type details
   */
  async getEventType(): Promise<any> {
    try {
      const response = await fetch(
        `https://api.cal.com/v1/event-types/${this.config.eventTypeId}?apiKey=${this.config.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cal.com API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching event type:', error);
      throw error;
    }
  }

  /**
   * Transform Cal.com v2 availability response to our format
   */
  private transformV2AvailabilityData(data: any): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    
    if (data.data && data.data.slots) {
      // Process v2 API slots format: { "2025-06-06": [{ "time": "2025-06-06T04:00:00.000Z" }] }
      for (const [date, daySlots] of Object.entries(data.data.slots)) {
        if (Array.isArray(daySlots)) {
          for (const slot of daySlots) {
            if (slot.time) {
              const slotDate = new Date(slot.time);
              slots.push({
                time: slotDate.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true,
                  timeZone: this.config.timezone 
                }),
                date: slotDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  timeZone: this.config.timezone 
                }),
                available: true,
              });
            }
          }
        }
      }
    }
    
    return slots;
  }

  /**
   * Transform Cal.com availability response to our format (legacy v1 format)
   */
  private transformAvailabilityData(data: any): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    
    if (data.busy) {
      // Process busy slots and generate available slots
      // This is a simplified implementation
      for (const busySlot of data.busy) {
        slots.push({
          time: new Date(busySlot.start).toLocaleTimeString(),
          date: new Date(busySlot.start).toDateString(),
          available: false,
        });
      }
    }

    // Add logic to generate available slots based on event type configuration
    // This would typically involve checking working hours, duration, etc.
    
    return slots;
  }



  /**
   * Format availability response for the agent
   */
  formatAvailabilityResponse(slots: AvailabilitySlot[]): string {
    const availableSlots = slots.filter(slot => slot.available);
    
    if (availableSlots.length === 0) {
      return "I'm sorry, but there are no available time slots for the requested dates. Please try selecting different dates, and I'll check our calendar again for you.";
    }

    const response = "Great news! I found several available appointment slots for you:\n\n" +
      availableSlots.map((slot, index) => 
        `${index + 1}. ${slot.date} at ${slot.time}`
      ).join('\n') +
      "\n\nPlease tell me which time slot works best for you, and I'll be happy to book that appointment for you right away. You can just say the number or tell me the specific day and time you prefer.";

    return response;
  }

  /**
   * Format booking confirmation response
   */
  formatBookingResponse(booking: BookingResponse): string {
    return `Great! Your appointment has been successfully booked.

Booking Details:
- Confirmation ID: ${booking.uid}
- Date & Time: ${new Date(booking.start).toLocaleString()}
- Duration: ${Math.round((new Date(booking.end).getTime() - new Date(booking.start).getTime()) / (1000 * 60))} minutes

You should receive a confirmation email shortly. Is there anything else I can help you with?`;
  }
} 
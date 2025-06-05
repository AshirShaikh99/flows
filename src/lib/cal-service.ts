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
      const response = await fetch(
        `https://api.cal.com/v1/availability?apiKey=${this.config.apiKey}&eventTypeId=${this.config.eventTypeId}&dateFrom=${startDate}&dateTo=${endDate}&timeZone=${this.config.timezone}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Cal.com API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      // Transform Cal.com response to our format
      return this.transformAvailabilityData(data);
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
        `https://api.cal.com/v1/bookings?apiKey=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventTypeId: parseInt(this.config.eventTypeId),
            start: bookingData.start,
            end: bookingData.end,
            responses: {
              name: bookingData.name,
              email: bookingData.email,
            },
            timeZone: this.config.timezone,
            language: 'en',
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
   * Transform Cal.com availability response to our format
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
      return "I'm sorry, but there are no available time slots for the requested dates. Please try selecting different dates.";
    }

    const response = "Here are the available time slots:\n\n" +
      availableSlots.map((slot, index) => 
        `${index + 1}. ${slot.date} at ${slot.time}`
      ).join('\n') +
      "\n\nWhich time slot would you prefer?";

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
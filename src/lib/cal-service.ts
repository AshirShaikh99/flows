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
   * Format availability response for the agent (speech-optimized)
   */
  formatAvailabilityResponse(slots: AvailabilitySlot[]): string {
    const availableSlots = slots.filter(slot => slot.available);
    
    if (availableSlots.length === 0) {
      return "I'm sorry, but there are no available time slots for the requested dates. Please try selecting different dates, and I'll check our calendar again for you.";
    }

    // Format slots for speech with clear pauses and pronunciation
    let response = "Great news! I found several available appointment slots for you. Here are your options:\n\n";
    
    availableSlots.forEach((slot, index) => {
      // Format time for better speech (e.g., "2:00 PM" becomes "two o'clock PM")
      const speechTime = this.formatTimeForSpeech(slot.time);
      // Format date for better speech (e.g., "Monday, January 15th, 2024")
      const speechDate = this.formatDateForSpeech(slot.date);
      
      response += `Option ${index + 1}: ${speechDate} at ${speechTime}\n`;
    });

    response += "\nPlease tell me which time slot works best for you by saying the option number, or tell me the specific day and time you prefer. I'll be happy to book that appointment for you right away.";

    return response;
  }

  /**
   * Format time for better speech pronunciation
   */
  private formatTimeForSpeech(time: string): string {
    // Convert "2:00 PM" to "two o'clock PM", "2:30 PM" to "two thirty PM"
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) return time;

    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2];
    const ampm = timeMatch[3].toUpperCase();

    let hourText = '';
    switch (hour) {
      case 1: hourText = 'one'; break;
      case 2: hourText = 'two'; break;
      case 3: hourText = 'three'; break;
      case 4: hourText = 'four'; break;
      case 5: hourText = 'five'; break;
      case 6: hourText = 'six'; break;
      case 7: hourText = 'seven'; break;
      case 8: hourText = 'eight'; break;
      case 9: hourText = 'nine'; break;
      case 10: hourText = 'ten'; break;
      case 11: hourText = 'eleven'; break;
      case 12: hourText = 'twelve'; break;
      default: hourText = hour.toString();
    }

    if (minute === '00') {
      return `${hourText} o'clock ${ampm}`;
    } else if (minute === '15') {
      return `${hourText} fifteen ${ampm}`;
    } else if (minute === '30') {
      return `${hourText} thirty ${ampm}`;
    } else if (minute === '45') {
      return `${hourText} forty-five ${ampm}`;
    } else {
      return `${hourText} ${minute} ${ampm}`;
    }
  }

  /**
   * Format date for better speech pronunciation
   */
  private formatDateForSpeech(date: string): string {
    // Convert "Monday, January 15, 2024" to "Monday, January fifteenth, twenty twenty-four"
    const dateObj = new Date(date);
    
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();

    // Convert day number to ordinal for speech
    let dayText = '';
    if (day === 1 || day === 21 || day === 31) dayText = `${day}st`;
    else if (day === 2 || day === 22) dayText = `${day}nd`;
    else if (day === 3 || day === 23) dayText = `${day}rd`;
    else dayText = `${day}th`;

    return `${weekday}, ${month} ${dayText}`;
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
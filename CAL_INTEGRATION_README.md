# Cal.com Integration for Flow Builder

This implementation adds Cal.com calendar integration to the Flow Builder, allowing you to create conversational flows that can check calendar availability and book appointments dynamically.

## Features

### 1. Check Calendar Availability Node
- **Node Type**: `cal_check_availability`
- **Purpose**: Check available time slots in a Cal.com calendar
- **Agent Behavior**: When users ask about availability, the agent will:
  1. Ask for preferred date/date range if not provided
  2. Use the `checkCalendarAvailability` tool to fetch available slots
  3. Present available time slots in a user-friendly format
  4. Transition to the next node in the flow

### 2. Book Appointment Node
- **Node Type**: `cal_book_appointment`
- **Purpose**: Book appointments using Cal.com
- **Agent Behavior**: When users want to book an appointment, the agent will:
  1. Collect required information (name, email, preferred date/time)
  2. Confirm details with the user
  3. Use the `bookAppointment` tool to create the booking
  4. Provide confirmation details
  5. Transition to the next node in the flow

## Configuration

Each Cal.com node requires the following configuration:

### Required Fields
- **Cal.com API Key**: Your Cal.com API key for authentication
- **Event Type ID**: The ID of the event type you want to use for bookings
- **Timezone**: The timezone for the calendar (defaults to America/Los_Angeles)

### Optional Fields
- **Node Title**: Custom title for the node
- **Description**: Description of what the node does

## How to Use

### 1. Adding Cal.com Nodes to Your Flow

1. **Open the Flow Builder**
2. **Drag a Cal.com node** from the sidebar:
   - "Check Calendar Availability" for availability checking
   - "Book Appointment" for booking functionality
3. **Configure the node** by clicking the settings icon or using the config panel
4. **Connect the node** to other nodes in your flow

### 2. Configuring Cal.com Credentials

1. **Click on the Cal.com node** to select it
2. **Open the configuration panel** (right sidebar)
3. **Enter your Cal.com API Key**
4. **Enter your Event Type ID**
5. **Select the appropriate timezone**
6. **Save the configuration**

### 3. Setting Up Transitions

Cal.com nodes support transitions just like other workflow nodes:
- Add transitions to define where the conversation goes after checking availability or booking
- Use transition labels like "Show availability", "Book appointment", "Continue", etc.

## Example Flow Structure

```
Start Node
    ↓
Welcome/Greeting Node
    ↓
Check Calendar Availability Node
    ↓
Book Appointment Node
    ↓
Confirmation/Thank You Node
```

## API Endpoints

The integration includes two main API endpoints:

### Check Availability
- **Endpoint**: `/api/cal/check-availability`
- **Method**: POST
- **Parameters**:
  - `startDate`: Start date for availability check (YYYY-MM-DD)
  - `endDate`: End date for availability check (optional)
  - `nodeId`: The current node ID

### Book Appointment
- **Endpoint**: `/api/cal/book-appointment`
- **Method**: POST
- **Parameters**:
  - `name`: Customer name
  - `email`: Customer email
  - `startDateTime`: Appointment start time (ISO 8601)
  - `duration`: Duration in minutes (optional, defaults to 60)
  - `nodeId`: The current node ID

## Agent Prompts

The system automatically generates appropriate prompts for each node type:

### Check Availability Node Prompt
```
CALENDAR AVAILABILITY CHECK:
Check calendar availability and provide available time slots to the user.

You have access to a 'checkCalendarAvailability' tool to check available time slots. When users ask about availability:
1. Ask for their preferred date or date range if not provided
2. Use the checkCalendarAvailability tool with the startDate parameter (and optionally endDate)
3. Present the available time slots to the user in a friendly format
4. After showing availability, use the 'changeStage' tool to continue the conversation flow

Cal.com Configuration:
- API Key: Configured
- Event Type ID: 12345
- Timezone: America/Los_Angeles

Always ask for confirmation before proceeding to booking.
```

### Book Appointment Node Prompt
```
APPOINTMENT BOOKING:
Book appointments for users using the calendar integration.

You have access to a 'bookAppointment' tool to book appointments. When users want to book:
1. Collect required information: name, email, preferred date/time
2. Confirm the details with the user
3. Use the bookAppointment tool with the collected information
4. Provide confirmation details to the user
5. Use the 'changeStage' tool to continue the conversation flow

Cal.com Configuration:
- API Key: Configured
- Event Type ID: 12345
- Timezone: America/Los_Angeles

Always confirm booking details before making the appointment and provide clear confirmation after booking.
```

## Implementation Details

### Components Added

1. **CalNode.tsx**: React component for Cal.com nodes with inline configuration
2. **cal-service.ts**: Service class for Cal.com API interactions
3. **API Routes**: 
   - `/api/cal/check-availability`
   - `/api/cal/book-appointment`

### Type Definitions

Added to `types.ts`:
- New node types: `cal_check_availability`, `cal_book_appointment`
- Cal.com configuration properties in `NodeData` interface

### Integration Points

1. **FlowBuilder**: Updated to support Cal.com node types
2. **NodeSidebar**: Added Cal.com nodes to the available node types
3. **ConfigPanel**: Added Cal.com-specific configuration fields
4. **UltraVox Integration**: Added Cal.com tools and system prompts

## Error Handling

The implementation includes comprehensive error handling:

### API Error Handling
- Comprehensive error handling for authentication issues (401/403)
- Specific error messages for different failure scenarios
- Rate limiting detection and user-friendly messaging

### User-Friendly Error Messages
- Clear error messages for missing configuration
- Helpful suggestions when booking fails
- Validation for email format and required fields

## Production Requirements

This integration requires valid Cal.com API credentials and active event types:

- **Cal.com API Key**: Valid API key from your Cal.com account
- **Event Type ID**: Active event type configured in your Cal.com calendar
- **Network Access**: Reliable connection to Cal.com API endpoints

## Getting Started

1. **Get Cal.com API Credentials**:
   - Sign up for Cal.com
   - Generate an API key
   - Create an event type and note its ID

2. **Create a Flow**:
   - Add a start node
   - Add a Cal.com availability check node
   - Add a Cal.com booking node
   - Connect them with appropriate transitions

3. **Configure Nodes**:
   - Enter your Cal.com API key
   - Enter your event type ID
   - Set the appropriate timezone

4. **Test the Flow**:
   - Start a conversation
   - Ask about availability
   - Try booking an appointment

## Best Practices

### Flow Design
- Always check availability before allowing booking
- Provide clear confirmation after booking
- Include error handling transitions
- Use descriptive transition labels

### User Experience
- Ask for confirmation before booking
- Provide clear booking details
- Handle timezone differences appropriately
- Offer alternative times if requested slots are unavailable

### Configuration
- Use descriptive node titles
- Set appropriate timezones for your users
- Test with your actual Cal.com setup
- Keep API keys secure

## Troubleshooting

### Common Issues

1. **"API Key not configured"**
   - Ensure you've entered your Cal.com API key in the node configuration

2. **"Event Type ID not found"**
   - Verify the event type ID exists in your Cal.com account
   - Check that the event type is active

3. **"No available slots"**
   - Check your Cal.com availability settings
   - Verify the timezone configuration
   - Ensure the requested date range is valid

4. **Booking failures**
   - Verify email format is correct
   - Check that the time slot is still available
   - Ensure all required fields are provided

5. **"Authentication issue with calendar service"**
   - Verify your Cal.com API key is correct and active
   - Check that your API key has proper permissions
   - Ensure your Cal.com account is in good standing

6. **"Calendar service temporarily busy"**
   - Wait a few minutes before retrying
   - Check Cal.com status page for service issues
   - Verify you haven't exceeded API rate limits

### Debug Mode

Enable debug logging by checking the browser console and server logs for detailed information about:
- API requests and responses
- Node transitions
- Tool calls
- Error details

## Future Enhancements

Potential improvements for the Cal.com integration:

1. **Multiple Calendar Support**: Support for multiple event types
2. **Recurring Appointments**: Support for recurring bookings
3. **Cancellation Flow**: Add nodes for canceling appointments
4. **Rescheduling**: Add nodes for rescheduling existing appointments
5. **Calendar Sync**: Real-time calendar synchronization
6. **Advanced Availability**: Support for complex availability rules
7. **Team Scheduling**: Support for team-based scheduling

This implementation provides a solid foundation for calendar integration in conversational flows, with room for expansion based on specific use cases and requirements. 
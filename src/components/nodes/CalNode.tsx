import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Calendar, CalendarCheck, Settings, Save, AlertCircle, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { NodeData, NodeTransition } from '../../types';

interface CalNodeProps extends NodeProps {
  data: NodeData & {
    onNodeUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
  };
}

const getNodeConfig = (type: string) => {
  switch (type) {
    case 'cal_check_availability':
      return {
        icon: CalendarCheck,
        color: 'bg-blue-50',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-300',
        handleColor: '#3b82f6', // blue-500
        title: 'Check Calendar Availability',
        description: 'Check available time slots using Cal.com'
      };
    case 'cal_book_appointment':
      return {
        icon: Calendar,
        color: 'bg-green-50',
        iconColor: 'text-green-600',
        borderColor: 'border-green-300',
        handleColor: '#22c55e', // green-500
        title: 'Book Appointment',
        description: 'Book appointment using Cal.com'
      };
    case 'cal_booking_confirmation':
      return {
        icon: Calendar,
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
        borderColor: 'border-purple-300',
        handleColor: '#8b5cf6', // purple-500
        title: 'Booking Confirmation',
        description: 'Confirm booking details word-by-word'
      };
    default:
      return {
        icon: Calendar,
        color: 'bg-gray-50',
        iconColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        handleColor: '#6b7280', // gray-500
        title: 'Cal Function',
        description: 'Cal.com integration function'
      };
  }
};

// Custom handle styles following ReactFlow best practices
const getHandleStyle = (color: string) => ({
  width: '16px',
  height: '16px',
  backgroundColor: color,
  border: '2px solid #ffffff',
  borderRadius: '50%',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.2s ease',
});

const CalNode: React.FC<CalNodeProps> = ({ id, data, selected, type }) => {
  const config = getNodeConfig(type);
  const IconComponent = config.icon;
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [nodeTitle, setNodeTitle] = useState(data.nodeTitle || config.title);
  const [apiKey, setApiKey] = useState(data.calApiKey || '');
  const [eventTypeId, setEventTypeId] = useState(data.calEventTypeId || '');
  const [timezone, setTimezone] = useState(data.calTimezone || 'America/Los_Angeles');
  const [description, setDescription] = useState(data.description || config.description);
  const [transitions, setTransitions] = useState<NodeTransition[]>(data.transitions || []);
  const [isSaving, setIsSaving] = useState(false);
  
  const onNodeUpdate = data.onNodeUpdate;
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with incoming data prop changes
  useEffect(() => {
    setNodeTitle(data.nodeTitle || config.title);
    setApiKey(data.calApiKey || '');
    setEventTypeId(data.calEventTypeId || '');
    setTimezone(data.calTimezone || 'America/Los_Angeles');
    setDescription(data.description || config.description);
    setTransitions(data.transitions || []);
  }, [data.nodeTitle, data.calApiKey, data.calEventTypeId, data.calTimezone, data.description, data.transitions, config.title, config.description]);

  // Auto-save with debounce
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (onNodeUpdate) {
        onNodeUpdate(id, {
          nodeTitle,
          calApiKey: apiKey,
          calEventTypeId: eventTypeId,
          calTimezone: timezone,
          description,
          transitions,
          calFunctionType: type === 'cal_check_availability' ? 'check_availability' : 'book_appointment',
          content: generateSystemPrompt()
        });
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodeTitle, apiKey, eventTypeId, timezone, description, transitions, onNodeUpdate, id, type]);

  const generateSystemPrompt = () => {
    if (type === 'cal_check_availability') {
      return `When users ask for availability, check the calendar and provide available slots.

Cal.com API Configuration:
- API Key: ${apiKey ? '***configured***' : 'NOT SET'}
- Event Type ID: ${eventTypeId || 'NOT SET'}
- Timezone: ${timezone}

Use the 'changeStage' tool when ready to continue to the next step in the conversation flow.`;
    } else if (type === 'cal_book_appointment') {
      return `When users ask to book an appointment, book it on the calendar.

Cal.com API Configuration:
- API Key: ${apiKey ? '***configured***' : 'NOT SET'}
- Event Type ID: ${eventTypeId || 'NOT SET'}
- Timezone: ${timezone}

Use the 'changeStage' tool when ready to continue to the next step in the conversation flow.`;
    } else if (type === 'cal_booking_confirmation') {
      return `Handle detailed booking confirmation with word-by-word verification of customer details for voice interactions.

Use the 'bookingConfirmation' tool to guide users through step-by-step confirmation:
1. Collect user details with spelling confirmation
2. Verify name letter by letter
3. Verify email character by character  
4. Final confirmation before booking
5. Complete the booking process

Cal.com API Configuration:
- API Key: ${apiKey ? '***configured***' : 'NOT SET'}
- Event Type ID: ${eventTypeId || 'NOT SET'}
- Timezone: ${timezone}

Use the 'changeStage' tool when ready to continue to the next step in the conversation flow.`;
    } else {
      return `Cal.com integration function.

Cal.com API Configuration:
- API Key: ${apiKey ? '***configured***' : 'NOT SET'}
- Event Type ID: ${eventTypeId || 'NOT SET'}
- Timezone: ${timezone}

Use the 'changeStage' tool when ready to continue to the next step in the conversation flow.`;
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    if (onNodeUpdate) {
      let calFunctionType: 'check_availability' | 'book_appointment' | 'booking_confirmation' = 'book_appointment';
      if (type === 'cal_check_availability') {
        calFunctionType = 'check_availability';
      } else if (type === 'cal_booking_confirmation') {
        calFunctionType = 'booking_confirmation';
      }
      
      onNodeUpdate(id, {
        nodeTitle,
        calApiKey: apiKey,
        calEventTypeId: eventTypeId,
        calTimezone: timezone,
        description,
        transitions,
        calFunctionType,
        content: generateSystemPrompt()
      });
    }
    setTimeout(() => {
      setIsSaving(false);
      setIsConfigOpen(false);
    }, 500);
  };

  const addTransition = () => {
    let defaultLabel = 'Continue';
    if (type === 'cal_check_availability') {
      defaultLabel = 'Show availability';
    } else if (type === 'cal_book_appointment') {
      defaultLabel = 'Book appointment';
    } else if (type === 'cal_booking_confirmation') {
      defaultLabel = 'Booking completed';
    }
    
    const newTransition: NodeTransition = {
      id: `transition-${Date.now()}`,
      label: defaultLabel,
      triggerType: 'user_response'
    };
    const updatedTransitions = [...transitions, newTransition];
    setTransitions(updatedTransitions);
    if (onNodeUpdate) {
      onNodeUpdate(id, { transitions: updatedTransitions });
    }
  };

  const removeTransition = (transitionId: string) => {
    const updatedTransitions = transitions.filter(t => t.id !== transitionId);
    setTransitions(updatedTransitions);
    if (onNodeUpdate) {
      onNodeUpdate(id, { transitions: updatedTransitions });
    }
  };

  const updateTransition = (transitionId: string, label: string) => {
    const updatedTransitions = transitions.map(t =>
      t.id === transitionId ? { ...t, label } : t
    );
    setTransitions(updatedTransitions);
    if (onNodeUpdate) {
      onNodeUpdate(id, { transitions: updatedTransitions });
    }
  };

  const handleTransitionEdit = (transitionId: string, newLabel: string) => {
    updateTransition(transitionId, newLabel);
  };

  const isConfigured = apiKey && eventTypeId;

  const inputHandleStyle = {
    ...getHandleStyle(config.handleColor),
    left: '-8px',
  };

  const outputHandleStyle = {
    ...getHandleStyle(config.handleColor),
    right: '-8px',
  };

  return (
    <div className={`relative bg-white rounded-xl min-w-[400px] max-w-[500px] shadow-lg border-2 ${
      selected ? `${config.borderColor}` : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className={`${config.color} rounded-t-xl px-4 py-3 border-b ${config.borderColor.replace('border-', 'border-b-')}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
            <h3 className={`${config.iconColor} text-lg font-semibold`}>{nodeTitle}</h3>
          </div>
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`p-1 rounded ${config.iconColor} hover:bg-gray-100 transition-colors`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Description and Status */}
        <div className="space-y-3">
          <div className="text-gray-600 text-sm leading-relaxed">
            {description}
          </div>
          
          {/* Configuration Status */}
          <div className="flex items-center gap-2 text-sm">
            {isConfigured ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Configured</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-600">Needs configuration</span>
              </>
            )}
          </div>
        </div>

        {/* Transition Section - Following WorkflowNode design */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-sm font-medium">Transitions</span>
            </div>
            <button
              onClick={addTransition}
              className={`p-1 text-gray-500 hover:${config.iconColor} hover:${config.color} rounded`}
              title="Add transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {transitions.map((transition) => (
              <div
                key={transition.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:bg-gray-100 min-h-[60px]">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                    <input
                      type="text"
                      value={transition.label}
                      onChange={(e) => handleTransitionEdit(transition.id, e.target.value)}
                      onBlur={handleSave}
                      className="flex-1 text-sm text-gray-700 bg-transparent border-none outline-none focus:ring-0 hover:bg-white hover:border hover:border-gray-300 rounded px-2 py-1"
                      placeholder="Transition description..."
                    />
                  </div>
                  <button
                    onClick={() => removeTransition(transition.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity flex-shrink-0"
                    title="Remove transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
            ))}
            
            {transitions.length === 0 && (
              <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-100">
                No transitions configured. Click + to add transitions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Node Title
              </label>
              <input
                type="text"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter node title..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cal.com API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Cal.com API key..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Event Type ID
              </label>
              <input
                type="text"
                value={eventTypeId}
                onChange={(e) => setEventTypeId(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Event Type ID..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Enter description..."
              />
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3 h-3" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
      
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          ...inputHandleStyle,
          top: '50%',
          zIndex: 10,
        }}
      />
      
      {/* Output Handles - one for each transition */}
      {transitions.map((transition, index) => {
        // Calculate position based on component layout:
        // Header (~60px) + Content padding + Description/Status (~80px) + Transition header (~40px) + transition spacing
        const baseOffset = 180; // Base offset to start of transitions
        const transitionHeight = 60; // Height of each transition element
        const transitionSpacing = 12; // space-y-3 = 12px
        const handleOffset = baseOffset + (index * (transitionHeight + transitionSpacing)) + (transitionHeight / 2);
        
        return (
          <Handle
            key={transition.id}
            type="source"
            position={Position.Right}
            id={transition.id}
            style={{ 
              ...outputHandleStyle,
              top: `${handleOffset}px`,
              zIndex: 10,
            }}
          />
        );
      })}
      
      {/* Default source handle if no transitions */}
      {transitions.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...outputHandleStyle,
            top: '50%',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export default CalNode; 
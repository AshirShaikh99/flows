import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Calendar, CalendarCheck, Settings, Save, AlertCircle } from 'lucide-react';
import { NodeData } from '../../types';

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
        handleColor: 'bg-blue-400',
        title: 'Check Calendar Availability',
        description: 'Check available time slots using Cal.com'
      };
    case 'cal_book_appointment':
      return {
        icon: Calendar,
        color: 'bg-green-50',
        iconColor: 'text-green-600',
        borderColor: 'border-green-300',
        handleColor: 'bg-green-400',
        title: 'Book Appointment',
        description: 'Book appointment using Cal.com'
      };
    default:
      return {
        icon: Calendar,
        color: 'bg-gray-50',
        iconColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        handleColor: 'bg-gray-400',
        title: 'Cal Function',
        description: 'Cal.com integration function'
      };
  }
};

const CalNode: React.FC<CalNodeProps> = ({ id, data, selected, type }) => {
  const config = getNodeConfig(type);
  const IconComponent = config.icon;
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [nodeTitle, setNodeTitle] = useState(data.nodeTitle || config.title);
  const [apiKey, setApiKey] = useState(data.calApiKey || '');
  const [eventTypeId, setEventTypeId] = useState(data.calEventTypeId || '');
  const [timezone, setTimezone] = useState(data.calTimezone || 'America/Los_Angeles');
  const [description, setDescription] = useState(data.description || config.description);
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
  }, [data.nodeTitle, data.calApiKey, data.calEventTypeId, data.calTimezone, data.description, config.title, config.description]);

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
  }, [nodeTitle, apiKey, eventTypeId, timezone, description, onNodeUpdate, id, type]);

  const generateSystemPrompt = () => {
    const functionType = type === 'cal_check_availability' ? 'check_availability' : 'book_appointment';
    
    if (functionType === 'check_availability') {
      return `When users ask for availability, check the calendar and provide available slots.

Cal.com API Configuration:
- API Key: ${apiKey ? '***configured***' : 'NOT SET'}
- Event Type ID: ${eventTypeId || 'NOT SET'}
- Timezone: ${timezone}

Use the 'changeStage' tool when ready to continue to the next step in the conversation flow.`;
    } else {
      return `When users ask to book an appointment, book it on the calendar.

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
      onNodeUpdate(id, {
        nodeTitle,
        calApiKey: apiKey,
        calEventTypeId: eventTypeId,
        calTimezone: timezone,
        description,
        calFunctionType: type === 'cal_check_availability' ? 'check_availability' : 'book_appointment',
        content: generateSystemPrompt()
      });
    }
    setTimeout(() => {
      setIsSaving(false);
      setIsConfigOpen(false);
    }, 500);
  };

  const isConfigured = apiKey && eventTypeId;

  return (
    <div className={`relative bg-white rounded-lg min-w-[280px] max-w-[320px] shadow-sm border ${
      selected ? `${config.borderColor} shadow-md` : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className={`${config.color} rounded-t-lg p-3 border-b ${config.borderColor.replace('border-', 'border-b-')}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
            <span className={`${config.iconColor} text-sm font-medium`}>{nodeTitle}</span>
          </div>
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`p-1 rounded ${config.iconColor} hover:bg-gray-100 transition-colors`}
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-gray-600 text-sm leading-relaxed mb-3">
          {description}
        </div>
        
        {/* Configuration Status */}
        <div className="flex items-center gap-2 text-xs">
          {isConfigured ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600">Configured</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600">Needs configuration</span>
            </>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
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
      
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={`w-3 h-3 ${config.handleColor} border-2 border-white`}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className={`w-3 h-3 ${config.handleColor} border-2 border-white`}
      />
    </div>
  );
};

export default CalNode; 
import React from 'react';
import { Play, MessageSquare, HelpCircle, GitBranch, Workflow, Calendar, CalendarCheck } from 'lucide-react';
import { NodeType } from '../types';

interface NodeSidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

const NodeSidebar: React.FC<NodeSidebarProps> = ({ onDragStart }) => {
  const nodeTypes = [
    {
      type: 'start' as NodeType,
      label: 'Start',
      icon: Play,
      color: 'text-green-600',
      description: 'Begin the conversation flow'
    },
    {
      type: 'workflow' as NodeType,
      label: 'Workflow Node',
      icon: Workflow,
      color: 'text-indigo-600',
      description: 'Node with transition management'
    },
    {
      type: 'cal_check_availability' as NodeType,
      label: 'Check Calendar Availability',
      icon: CalendarCheck,
      color: 'text-blue-600',
      description: 'Check calendar availability using Cal.com'
    },
    {
      type: 'cal_book_appointment' as NodeType,
      label: 'Book Appointment',
      icon: Calendar,
      color: 'text-green-600',
      description: 'Book appointment using Cal.com'
    },
    // {
    //   type: 'conversation' as NodeType,
    //   label: 'Conversation',
    //   icon: Hash,
    //   color: 'text-purple-600',
    //   description: 'Basic conversation node'
    // },
    // {
    //   type: 'function' as NodeType,
    //   label: 'Function',
    //   icon: Settings,
    //   color: 'text-purple-600',
    //   description: 'Execute custom function'
    // },
    // {
    //   type: 'call_transfer' as NodeType,
    //   label: 'Call Transfer',
    //   icon: Phone,
    //   color: 'text-orange-600',
    //   description: 'Transfer call to another agent'
    // },
    // {
    //   type: 'press_digit' as NodeType,
    //   label: 'Press Digit',
    //   icon: Grid3X3,
    //   color: 'text-blue-600',
    //   description: 'Handle digit input'
    // },
    // {
    //   type: 'logic_split' as NodeType,
    //   label: 'Logic Split Node',
    //   icon: Split,
    //   color: 'text-blue-600',
    //   description: 'Conditional logic branching'
    // },
    // {
    //   type: 'sms' as NodeType,
    //   label: 'SMS',
    //   icon: MessageCircle,
    //   color: 'text-yellow-600',
    //   description: 'Send SMS message'
    // },
    // {
    //   type: 'ending' as NodeType,
    //   label: 'Ending',
    //   icon: Square,
    //   color: 'text-gray-600',
    //   description: 'End the conversation'
    // }
  ];

  return (
    <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">ADD NEW NODE</h3>
      
      <div className="space-y-1">
        {nodeTypes.map((nodeType) => {
          const IconComponent = nodeType.icon;
          
          return (
            <div
              key={nodeType.type}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type)}
              className="flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors group"
            >
              <IconComponent className={`w-4 h-4 ${nodeType.color}`} />
              <span className="text-gray-700 text-sm font-medium">{nodeType.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NodeSidebar; 
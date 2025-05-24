import React from 'react';
import { MessageSquare, HelpCircle, GitBranch } from 'lucide-react';
import { NodeType } from '../types';

interface NodeSidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

const NodeSidebar: React.FC<NodeSidebarProps> = ({ onDragStart }) => {
  const nodeTypes = [
    {
      type: 'message' as NodeType,
      label: 'Message',
      icon: MessageSquare,
      color: 'bg-blue-500',
      description: 'Display AI messages'
    },
    {
      type: 'question' as NodeType,
      label: 'Question',
      icon: HelpCircle,
      color: 'bg-purple-500',
      description: 'Ask user questions'
    },
    {
      type: 'condition' as NodeType,
      label: 'Condition',
      icon: GitBranch,
      color: 'bg-yellow-500',
      description: 'Branch based on answers'
    }
  ];

  return (
    <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Nodes</h3>
      
      <div className="space-y-3">
        {nodeTypes.map((nodeType) => {
          const IconComponent = nodeType.icon;
          
          return (
            <div
              key={nodeType.type}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type)}
              className={`${nodeType.color} rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-all transform hover:scale-105`}
            >
              <div className="flex items-center gap-2 mb-1">
                <IconComponent className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">{nodeType.label}</span>
              </div>
              <p className="text-white text-xs opacity-90">{nodeType.description}</p>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-3 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How to use:</h4>
        <ol className="text-xs text-gray-600 space-y-1">
          <li>1. Drag nodes to canvas</li>
          <li>2. Connect nodes by dragging between handles</li>
          <li>3. Click nodes to configure</li>
          <li>4. Build your conversation flow</li>
        </ol>
      </div>
    </div>
  );
};

export default NodeSidebar; 
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Settings } from 'lucide-react';
import { NodeData } from '../../types';

interface MessageNodeProps extends NodeProps {
  data: NodeData;
}

const MessageNode: React.FC<MessageNodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative bg-blue-500 rounded-lg min-w-[150px] max-w-[200px] p-3 shadow-lg border-2 ${
      selected ? 'border-blue-300' : 'border-blue-600'
    } transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-medium">Message</span>
        {data.customPrompt && (
          <div title="Custom prompt configured">
            <Settings className="w-3 h-3 text-blue-200" />
          </div>
        )}
      </div>
      
      <div className="text-white text-xs leading-relaxed">
        {data.content || 'Click to add message...'}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-600 border-2 border-white"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-600 border-2 border-white"
      />
    </div>
  );
};

export default MessageNode; 
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types';

interface MessageNodeProps extends NodeProps {
  data: NodeData;
}

const MessageNode: React.FC<MessageNodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative`}>
      {/* Simple circular node */}
      <div className={`w-8 h-8 rounded-full bg-rose-400 shadow-sm border-2 ${
        selected ? 'border-rose-600 shadow-md' : 'border-white'
      } transition-all flex items-center justify-center`}>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-transparent border-0"
        style={{
          left: '-6px',
          background: 'transparent',
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-transparent border-0"
        style={{
          right: '-6px',
          background: 'transparent',
        }}
      />
    </div>
  );
};

export default MessageNode; 
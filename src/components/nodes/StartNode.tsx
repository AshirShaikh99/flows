import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play } from 'lucide-react';
import { NodeData } from '../../types';

interface StartNodeProps extends NodeProps {
  data: NodeData;
}

const StartNode: React.FC<StartNodeProps> = ({ selected }) => {
  return (
    <div className={`relative bg-green-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 ${
      selected ? 'border-green-300' : 'border-green-600'
    } transition-all`}>
      <Play className="w-6 h-6 text-white fill-white" />
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-600 border-2 border-white"
      />
      
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
        Start
      </div>
    </div>
  );
};

export default StartNode; 
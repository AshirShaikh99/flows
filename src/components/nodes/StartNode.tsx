import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Settings } from 'lucide-react';
import { NodeData } from '../../types';

interface StartNodeProps extends NodeProps {
  data: NodeData;
}

const StartNode: React.FC<StartNodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative bg-green-500 rounded-lg min-w-[150px] max-w-[200px] p-3 shadow-lg border-2 ${
      selected ? 'border-green-300' : 'border-green-600'
    } transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-medium">Start</span>
        {data.customPrompt && (
          <div title="Custom prompt configured">
            <Settings className="w-3 h-3 text-green-200" />
          </div>
        )}
      </div>
      
      <div className="text-white text-xs leading-relaxed">
        {data.content || 'Welcome! How can I help you today?'}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-600 border-2 border-white"
      />
    </div>
  );
};

export default StartNode; 
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Settings } from 'lucide-react';
import { NodeData } from '../../types';

interface StartNodeProps extends NodeProps {
  data: NodeData;
}

const StartNode: React.FC<StartNodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative bg-white rounded-lg min-w-[250px] max-w-[300px] shadow-sm border ${
      selected ? 'border-rose-300 shadow-md' : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className="bg-rose-50 rounded-t-lg p-3 border-b border-rose-200">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-rose-600" />
          <span className="text-rose-700 text-sm font-medium">{data.nodeTitle || 'Start'}</span>
          {data.customPrompt && (
            <div title="Custom prompt configured">
              <Settings className="w-3 h-3 text-rose-500" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {data.content ? (
        <div className="p-4">
          <div className="text-gray-600 text-sm leading-relaxed">
            {data.content}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="text-gray-500 text-sm italic text-center">
            Flow entry point
          </div>
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-rose-400 border-2 border-white"
      />
    </div>
  );
};

export default StartNode; 
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Settings } from 'lucide-react';
import { NodeData } from '../../types';

interface ConditionNodeProps extends NodeProps {
  data: NodeData;
}

const ConditionNode: React.FC<ConditionNodeProps> = ({ data, selected }) => {
  const condition = data.condition;
  
  return (
    <div className={`relative bg-white rounded-lg min-w-[250px] max-w-[300px] shadow-sm border ${
      selected ? 'border-rose-300 shadow-md' : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className="bg-rose-50 rounded-t-lg p-3 border-b border-rose-200">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-rose-600" />
          <span className="text-rose-700 text-sm font-medium">Condition Node</span>
          {data.customPrompt && (
            <div title="Custom prompt configured">
              <Settings className="w-3 h-3 text-rose-500" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {condition ? (
          <div className="space-y-2">
            <div className="text-gray-600 text-sm">
              <span className="font-medium">If response</span>
            </div>
                         <div className="text-gray-500 text-xs bg-gray-50 p-2 rounded">
               {condition.operator === 'equals' ? 'equals' : 'contains'} &quot;{condition.value}&quot;
             </div>
          </div>
        ) : (
          <div className="text-gray-600 text-sm leading-relaxed">
            Click to configure condition...
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-rose-400 border-2 border-white"
      />
      
      {/* True/False handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 bg-green-500 border-2 border-white"
        style={{ top: '40%' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-white"
        style={{ top: '60%' }}
      />
      
      {/* Labels for true/false */}
      <div className="absolute right-[-30px] top-[35%] text-xs text-green-600 font-medium">
        True
      </div>
      <div className="absolute right-[-35px] top-[55%] text-xs text-red-600 font-medium">
        False
      </div>
    </div>
  );
};

export default ConditionNode; 
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Settings } from 'lucide-react';
import { NodeData } from '../../types';

interface ConditionNodeProps extends NodeProps {
  data: NodeData;
}

const ConditionNode: React.FC<ConditionNodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative bg-yellow-500 rounded-lg min-w-[160px] max-w-[200px] p-3 shadow-lg border-2 ${
      selected ? 'border-yellow-300' : 'border-yellow-600'
    } transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-medium">Condition</span>
        {data.customPrompt && (
          <div title="Custom prompt configured">
            <Settings className="w-3 h-3 text-yellow-200" />
          </div>
        )}
      </div>
      
      <div className="text-white text-xs leading-relaxed">
        {data.condition ? (
          <>
            <div className="font-medium">{data.condition.operator}</div>
            <div className="text-yellow-100">&quot;{data.condition.value}&quot;</div>
          </>
        ) : (
          'Click to configure...'
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-600 border-2 border-white"
      />
      
      {/* Yes branch */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="w-3 h-3 bg-yellow-600 border-2 border-white"
        style={{ top: '35%' }}
      />
      
      {/* No branch */}
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        className="w-3 h-3 bg-yellow-600 border-2 border-white"
        style={{ top: '65%' }}
      />
    </div>
  );
};

export default ConditionNode; 
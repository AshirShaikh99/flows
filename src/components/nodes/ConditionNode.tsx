import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { NodeData } from '../../types';

interface ConditionNodeProps extends NodeProps {
  data: NodeData;
}

const ConditionNode: React.FC<ConditionNodeProps> = ({ selected }) => {
  return (
    <div className={`relative bg-yellow-500 rotate-45 w-20 h-20 flex items-center justify-center shadow-lg border-2 ${
      selected ? 'border-yellow-300' : 'border-yellow-600'
    } transition-all`}>
      <div className="-rotate-45">
        <GitBranch className="w-5 h-5 text-white" />
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-600 border-2 border-white"
        style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* True branch */}
      <Handle
        type="source"
        position={Position.Top}
        id="true"
        className="w-3 h-3 bg-yellow-600 border-2 border-white"
        style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}
      />
      
      {/* False branch */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-yellow-600 border-2 border-white"
        style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }}
      />
      
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap -rotate-45">
        Condition
      </div>
      
      {/* Labels for true/false branches */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-green-600 font-medium -rotate-45">
        Yes
      </div>
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-red-600 font-medium -rotate-45">
        No
      </div>
    </div>
  );
};

export default ConditionNode; 
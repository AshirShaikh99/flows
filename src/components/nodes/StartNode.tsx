import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play } from 'lucide-react';
import { NodeData } from '../../types';

interface StartNodeProps extends NodeProps {
  data: NodeData;
}

// Custom handle styles following ReactFlow best practices (same as WorkflowNode)
const handleStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid #ffffff',
  borderRadius: '50%',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.2s ease',
};

const outputHandleStyle = {
  ...handleStyle,
  backgroundColor: '#fb7185', // rose-400
  right: '-8px',
};

const StartNode: React.FC<StartNodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative bg-white rounded-full px-8 py-4 shadow-lg border-2 ${
      selected ? 'border-rose-300 shadow-xl' : 'border-gray-200'
    } transition-all min-w-[160px] flex items-center justify-center`}>
      
      <div className="flex items-center gap-3">
        <Play className="w-5 h-5 text-rose-600 fill-rose-600" />
        <span className="text-rose-700 text-base font-semibold">Begin</span>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          ...outputHandleStyle,
          top: '50%',
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default StartNode; 
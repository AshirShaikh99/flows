import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, ArrowRight } from 'lucide-react';
import { NodeData } from '../../types';

interface WorkflowNodeProps extends NodeProps {
  data: NodeData;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected }) => {
  const transitions = data.transitions || [];
  
  return (
    <div className={`relative bg-white rounded-lg min-w-[250px] max-w-[300px] shadow-sm border ${
      selected ? 'border-rose-300 shadow-md' : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className="bg-rose-50 rounded-t-lg p-3 border-b border-rose-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
          <span className="text-rose-700 text-sm font-medium">
            {data.nodeTitle || data.label || 'Workflow Node'}
          </span>
          {data.customPrompt && (
            <div title="Custom prompt configured">
              <Settings className="w-3 h-3 text-rose-500" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-gray-600 text-sm leading-relaxed mb-4">
          {data.content || data.systemPrompt || 'Click to configure this node...'}
        </div>

        {/* Transitions Section */}
        {transitions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2 border-t border-gray-200 pt-3">
              <ArrowRight className="w-3 h-3" />
              <span>Transition</span>
            </div>
            
            {transitions.map((transition) => (
              <div key={transition.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span className="text-xs text-gray-700">{transition.label}</span>
                </div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-rose-400 border-2 border-white"
      />
      
      {/* Output Handles - one for each transition */}
      {transitions.map((transition, index) => (
        <Handle
          key={transition.id}
          type="source"
          position={Position.Right}
          id={transition.id}
          className="w-3 h-3 bg-rose-400 border-2 border-white"
          style={{ 
            top: `${60 + index * 40}px`,
          }}
        />
      ))}
      
      {/* Default source handle if no transitions */}
      {transitions.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-rose-400 border-2 border-white"
        />
      )}
    </div>
  );
};

export default WorkflowNode; 
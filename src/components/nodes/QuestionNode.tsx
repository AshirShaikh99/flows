import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { HelpCircle, Settings, ArrowRight } from 'lucide-react';
import { NodeData } from '../../types';

interface QuestionNodeProps extends NodeProps {
  data: NodeData;
}

const QuestionNode: React.FC<QuestionNodeProps> = ({ data, selected }) => {
  const options = data.options || [];
  
  return (
    <div className={`relative bg-white rounded-lg min-w-[250px] max-w-[300px] shadow-sm border ${
      selected ? 'border-rose-300 shadow-md' : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className="bg-rose-50 rounded-t-lg p-3 border-b border-rose-200">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-rose-600" />
          <span className="text-rose-700 text-sm font-medium">Question Node</span>
          {data.customPrompt && (
            <div title="Custom prompt configured">
              <Settings className="w-3 h-3 text-rose-500" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-gray-600 text-sm leading-relaxed mb-3">
          {data.question || 'Click to add question...'}
        </div>
        
        {options.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
              <ArrowRight className="w-3 h-3" />
              <span>Response Options</span>
            </div>
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span className="text-xs text-gray-700">{index + 1}. {option.text}</span>
                </div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
            ))}
          </div>
        )}
        
        {options.length === 0 && (
          <div className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded">
            No response options configured
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-rose-400 border-2 border-white"
      />
      
      {/* Create handles for each response option */}
      {options.map((option, index) => (
        <Handle
          key={option.id}
          type="source"
          position={Position.Right}
          id={option.id}
          className="w-3 h-3 bg-rose-400 border-2 border-white"
          style={{ 
            top: `${60 + index * 40}px`,
          }}
        />
      ))}
      
      {/* Default source handle if no options */}
      {options.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-rose-400 border-2 border-white"
        />
      )}
    </div>
  );
};

export default QuestionNode; 
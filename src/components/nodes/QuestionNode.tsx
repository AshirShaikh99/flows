import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { HelpCircle, Settings } from 'lucide-react';
import { NodeData } from '../../types';

interface QuestionNodeProps extends NodeProps {
  data: NodeData;
}

const QuestionNode: React.FC<QuestionNodeProps> = ({ data, selected }) => {
  const options = data.options || [];
  
  return (
    <div className={`relative bg-purple-500 rounded-lg min-w-[180px] max-w-[220px] p-3 shadow-lg border-2 ${
      selected ? 'border-purple-300' : 'border-purple-600'
    } transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-medium">Question</span>
        {data.customPrompt && (
          <div title="Custom prompt configured">
            <Settings className="w-3 h-3 text-purple-200" />
          </div>
        )}
      </div>
      
      <div className="text-white text-xs leading-relaxed mb-2">
        {data.question || 'Click to add question...'}
      </div>
      
      {options.length > 0 && (
        <div className="text-white text-xs">
          <div className="font-medium mb-1">Options:</div>
          {options.map((option, index) => (
            <div key={option.id} className="text-purple-100">
              {index + 1}. {option.text}
            </div>
          ))}
        </div>
      )}
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-600 border-2 border-white"
      />
      
      {/* Create handles for each response option */}
      {options.map((option, index) => (
        <Handle
          key={option.id}
          type="source"
          position={Position.Right}
          id={option.id}
          className="w-3 h-3 bg-purple-600 border-2 border-white"
          style={{ 
            top: `${50 + (index - (options.length - 1) / 2) * 20}%`,
            transform: 'translateY(-50%)'
          }}
        />
      ))}
      
      {/* Default source handle if no options */}
      {options.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-purple-600 border-2 border-white"
        />
      )}
    </div>
  );
};

export default QuestionNode; 
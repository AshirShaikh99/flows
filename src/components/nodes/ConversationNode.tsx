import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Hash, Settings, Phone, Grid3X3, Split, MessageCircle, Square } from 'lucide-react';
import { NodeData } from '../../types';

interface ConversationNodeProps extends NodeProps {
  data: NodeData;
}

const getNodeConfig = (type: string) => {
  switch (type) {
    case 'conversation':
      return {
        icon: Hash,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    case 'function':
      return {
        icon: Settings,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    case 'call_transfer':
      return {
        icon: Phone,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    case 'press_digit':
      return {
        icon: Grid3X3,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    case 'logic_split':
      return {
        icon: Split,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    case 'sms':
      return {
        icon: MessageCircle,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    case 'ending':
      return {
        icon: Square,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
    default:
      return {
        icon: Hash,
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
        handleColor: 'bg-rose-400'
      };
  }
};

const ConversationNode: React.FC<ConversationNodeProps> = ({ data, selected, type }) => {
  const config = getNodeConfig(type);
  const IconComponent = config.icon;

  return (
    <div className={`relative bg-white rounded-lg min-w-[250px] max-w-[300px] shadow-sm border ${
      selected ? `${config.borderColor} shadow-md` : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className={`${config.color} rounded-t-lg p-3 border-b border-rose-200`}>
        <div className="flex items-center gap-2">
          <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
          <span className="text-rose-700 text-sm font-medium">{data.nodeTitle || 'Node'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-gray-600 text-sm leading-relaxed">
          {data.content || 'Click to configure this node...'}
        </div>
      </div>
      
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={`w-3 h-3 ${config.handleColor} border-2 border-white`}
      />
      
      {type !== 'ending' && (
        <Handle
          type="source"
          position={Position.Right}
          className={`w-3 h-3 ${config.handleColor} border-2 border-white`}
        />
      )}

      {/* Special handles for logic split */}
      {type === 'logic_split' && (
        <>
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
          <div className="absolute right-[-30px] top-[35%] text-xs text-green-600 font-medium">
            Yes
          </div>
          <div className="absolute right-[-30px] top-[55%] text-xs text-red-600 font-medium">
            No
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationNode; 
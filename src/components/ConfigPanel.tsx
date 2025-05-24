import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { FlowNode, ResponseOption, NodeType, NodeData } from '../types';

interface ConfigPanelProps {
  selectedNode: FlowNode | null;
  nodes: FlowNode[];
  onNodeUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ 
  selectedNode, 
  nodes,
  onNodeUpdate, 
  onClose 
}) => {
  const [content, setContent] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [conditionQuestionId, setConditionQuestionId] = useState('');
  const [conditionOperator, setConditionOperator] = useState<'equals' | 'contains'>('equals');
  const [conditionValue, setConditionValue] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setContent(selectedNode.data.content || '');
      setQuestion(selectedNode.data.question || '');
      setOptions(selectedNode.data.options || []);
      setConditionQuestionId(selectedNode.data.condition?.questionNodeId || '');
      setConditionOperator(selectedNode.data.condition?.operator || 'equals');
      setConditionValue(selectedNode.data.condition?.value || '');
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return null;
  }

  const handleSave = () => {
    const updatedData = { ...selectedNode.data };

    switch (selectedNode.type) {
      case 'message':
        updatedData.content = content;
        break;
      case 'question':
        updatedData.question = question;
        updatedData.options = options;
        break;
      case 'condition':
        updatedData.condition = {
          questionNodeId: conditionQuestionId,
          operator: conditionOperator,
          value: conditionValue
        };
        break;
    }

    onNodeUpdate(selectedNode.id, updatedData);
  };

  const addOption = () => {
    const newOption: ResponseOption = {
      id: `option-${Date.now()}`,
      text: ''
    };
    setOptions([...options, newOption]);
  };

  const removeOption = (optionId: string) => {
    setOptions(options.filter(option => option.id !== optionId));
  };

  const updateOption = (optionId: string, text: string) => {
    setOptions(options.map(option => 
      option.id === optionId ? { ...option, text } : option
    ));
  };

  const questionNodes = nodes.filter(node => node.type === 'question');

  const getNodeTitle = (type: NodeType) => {
    switch (type) {
      case 'start': return 'Start Node';
      case 'message': return 'Message Node';
      case 'question': return 'Question Node';
      case 'condition': return 'Condition Node';
      default: return 'Node';
    }
  };

  return (
    <div className="w-[300px] bg-white border-l border-gray-200 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {getNodeTitle(selectedNode.type)}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {selectedNode.type === 'start' && (
        <div className="text-sm text-gray-600">
          This is the starting point of your conversation flow. It cannot be deleted or modified.
        </div>
      )}

      {selectedNode.type === 'message' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              placeholder="Enter the message content..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
            <div className="text-xs text-gray-500 mt-1">
              {content.length} characters
            </div>
          </div>
        </div>
      )}

      {selectedNode.type === 'question' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onBlur={handleSave}
              placeholder="Enter your question..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Response Options
              </label>
              <button
                onClick={addOption}
                disabled={options.length >= 4}
                className="p-1 text-purple-600 hover:bg-purple-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                    onBlur={handleSave}
                    placeholder="Option text..."
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => removeOption(option.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {options.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                Add response options for users to choose from
              </div>
            )}
          </div>
        </div>
      )}

      {selectedNode.type === 'condition' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question to Check
            </label>
            <select
              value={conditionQuestionId}
              onChange={(e) => setConditionQuestionId(e.target.value)}
              onBlur={handleSave}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Select a question node...</option>
              {questionNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.data.question || `Question ${node.id.slice(-4)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={conditionOperator}
              onChange={(e) => setConditionOperator(e.target.value as 'equals' | 'contains')}
              onBlur={handleSave}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value to Compare
            </label>
            <input
              type="text"
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              onBlur={handleSave}
              placeholder="Enter comparison value..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigPanel; 
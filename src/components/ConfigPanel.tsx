import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { FlowNode, ResponseOption, NodeType, NodeData, NodeTransition } from '../types';

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
  const [customPrompt, setCustomPrompt] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<ResponseOption[]>([]);
  const [conditionQuestionId, setConditionQuestionId] = useState('');
  const [conditionOperator, setConditionOperator] = useState<'equals' | 'contains'>('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [nodeTitle, setNodeTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [transitions, setTransitions] = useState<NodeTransition[]>([]);

  useEffect(() => {
    if (selectedNode) {
      setContent(selectedNode.data.content || '');
      setCustomPrompt(selectedNode.data.customPrompt || '');
      setQuestion(selectedNode.data.question || '');
      setOptions(selectedNode.data.options || []);
      setConditionQuestionId(selectedNode.data.condition?.questionNodeId || '');
      setConditionOperator(selectedNode.data.condition?.operator || 'equals');
      setConditionValue(selectedNode.data.condition?.value || '');
      setNodeTitle(selectedNode.data.nodeTitle || '');
      setSystemPrompt(selectedNode.data.systemPrompt || '');
      setTransitions(selectedNode.data.transitions || []);
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return null;
  }

  const handleSave = () => {
    const updatedData = { ...selectedNode.data };

    // Always save custom prompt
    updatedData.customPrompt = customPrompt;

    switch (selectedNode.type) {
      case 'start':
        updatedData.content = content;
        break;
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
      case 'workflow':
        updatedData.nodeTitle = nodeTitle;
        updatedData.content = content;
        updatedData.systemPrompt = systemPrompt;
        updatedData.transitions = transitions;
        break;
      case 'conversation':
      case 'function':
      case 'call_transfer':
      case 'press_digit':
      case 'logic_split':
      case 'sms':
      case 'ending':
        updatedData.nodeTitle = nodeTitle;
        updatedData.content = content;
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
      case 'workflow': return 'Workflow Node';
      case 'conversation': return 'Conversation Node';
      case 'function': return 'Function Node';
      case 'call_transfer': return 'Call Transfer Node';
      case 'press_digit': return 'Press Digit Node';
      case 'logic_split': return 'Logic Split Node';
      case 'sms': return 'SMS Node';
      case 'ending': return 'Ending Node';
      default: return 'Node';
    }
  };

  const addTransition = () => {
    const newTransition: NodeTransition = {
      id: `transition-${Date.now()}`,
      label: '',
      triggerType: 'user_response'
    };
    const updatedTransitions = [...transitions, newTransition];
    setTransitions(updatedTransitions);
    // Immediately save the updated transitions
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, { transitions: updatedTransitions });
    }
  };

  const removeTransition = (transitionId: string) => {
    const updatedTransitions = transitions.filter(t => t.id !== transitionId);
    setTransitions(updatedTransitions);
    // Immediately save the updated transitions
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, { transitions: updatedTransitions });
    }
  };

  const updateTransition = (transitionId: string, updates: Partial<NodeTransition>) => {
    setTransitions(transitions.map(t => 
      t.id === transitionId ? { ...t, ...updates } : t
    ));
  };

  return (
    <div className="w-full sm:w-80 md:w-96 lg:w-[400px] min-w-[280px] max-w-[500px] bg-white border-l border-gray-200 shadow-lg h-full overflow-hidden transform transition-transform duration-300 ease-in-out md:transform-none animate-slide-in-right">
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {getNodeTitle(selectedNode.type)}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {selectedNode.type === 'start' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter the welcome message..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm text-gray-900"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">
                {content.length} characters
              </div>
            </div>
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm text-gray-900"
                rows={4}
              />
              <div className="text-xs text-gray-500 mt-1">
                {content.length} characters
              </div>
            </div>
          </div>
        )}

        {/* Configuration for new conversation node types */}
        {(['conversation', 'function', 'call_transfer', 'press_digit', 'logic_split', 'sms', 'ending'].includes(selectedNode.type)) && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Title
              </label>
              <input
                type="text"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter node title..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content/Instructions
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter the content or instructions for this node..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm text-gray-900"
                rows={4}
              />
              <div className="text-xs text-gray-500 mt-1">
                {content.length} characters
              </div>
            </div>
          </div>
        )}

        {/* Custom Prompt Section - Available for ALL node types */}
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🤖 Custom UltraVox Prompt
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onBlur={handleSave}
              placeholder="Enter custom instructions for UltraVox AI behavior at this node... (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm text-gray-900"
              rows={4}
            />
            <div className="text-xs text-gray-500 mt-1">
              {customPrompt.length} characters • Override default AI behavior for this conversation step
            </div>
            <div className="text-xs text-blue-600 mt-1">
              💡 Tip: Use this to give specific instructions like &quot;Be more casual&quot;, &quot;Ask follow-up questions&quot;, or &quot;Explain technical terms simply&quot;
            </div>
          </div>
        </div>

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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
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
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm min-w-0 text-gray-900"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-900"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-900"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-900"
              />
            </div>
          </div>
        )}

        {selectedNode.type === 'workflow' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Title
              </label>
              <input
                type="text"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter node title..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content/Instructions
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter the content or instructions for this node..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm text-gray-900"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt (Optional)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter system prompt for this node..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm text-gray-900"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <ArrowRight className="w-4 h-4 inline mr-1" />
                  Transitions
                </label>
                <button
                  onClick={addTransition}
                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {transitions.map((transition) => (
                  <div key={transition.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                    <input
                      type="text"
                      value={transition.label}
                      onChange={(e) => updateTransition(transition.id, { label: e.target.value })}
                      onBlur={handleSave}
                      placeholder="Transition label..."
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                    />
                    <select
                      value={transition.triggerType}
                      onChange={(e) => updateTransition(transition.id, { triggerType: e.target.value as 'user_response' | 'condition_met' | 'timeout' | 'manual' })}
                      onBlur={handleSave}
                      className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                    >
                      <option value="user_response">User Response</option>
                      <option value="condition_met">Condition Met</option>
                      <option value="timeout">Timeout</option>
                      <option value="manual">Manual</option>
                    </select>
                    <button
                      onClick={() => removeTransition(transition.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {transitions.length === 0 && (
                <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                  No transitions configured. Add transitions to define how the conversation flows from this node.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel; 
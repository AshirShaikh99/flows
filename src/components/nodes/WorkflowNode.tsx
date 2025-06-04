import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { NodeData, NodeTransition } from '../../types';

interface WorkflowNodeProps extends NodeProps {
  data: NodeData & {
    onNodeUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
  };
}

// Custom handle styles following ReactFlow best practices
const handleStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid #ffffff',
  borderRadius: '50%',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.2s ease',
};

const inputHandleStyle = {
  ...handleStyle,
  backgroundColor: '#fb7185', // rose-400
  left: '-8px',
};

const outputHandleStyle = {
  ...handleStyle,
  backgroundColor: '#fb7185', // rose-400
  right: '-8px',
};

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ id, data, selected }) => {
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const getInitialPromptValue = () => {
    if (data.customPrompt && data.customPrompt.trim()) {
      return data.customPrompt;
    }
    if (data.content && data.content.trim() && !data.content.includes('👋 Click here to add your custom AI assistant prompt')) {
      return data.content;
    }
    return '';
  };
  const [promptValue, setPromptValue] = useState(getInitialPromptValue());
  const [nodeTitle, setNodeTitle] = useState(data.nodeTitle || 'Welcome Node');
  const [transitions, setTransitions] = useState<NodeTransition[]>(data.transitions || []);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get onNodeUpdate from data
  const onNodeUpdate = data.onNodeUpdate;

  // Update internal state when data changes
  useEffect(() => {
    const newPromptValue = (() => {
      if (data.customPrompt && data.customPrompt.trim()) {
        return data.customPrompt;
      }
      if (data.content && data.content.trim() && !data.content.includes('👋 Click here to add your custom AI assistant prompt')) {
        return data.content;
      }
      return '';
    })();
    setPromptValue(newPromptValue);
    setNodeTitle(data.nodeTitle || 'Welcome Node');
    setTransitions(data.transitions || []);
  }, [data]);

  // Auto-resize textarea
  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
      promptTextareaRef.current.style.height = promptTextareaRef.current.scrollHeight + 'px';
    }
  }, [promptValue, isEditingPrompt]);

  // Focus on title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Auto-save with debounce
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Auto-save if we have any content (even if it's just a space or short text)
    if (promptValue.trim()) {
      console.log('💾 Auto-saving WorkflowNode prompt:', promptValue.substring(0, 30) + '...');
      setIsSaving(true);
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (onNodeUpdate) {
          onNodeUpdate(id, {
            nodeTitle,
            content: promptValue, // Update content field
            customPrompt: promptValue, // Also save as customPrompt for consistency
            transitions
          });
          console.log('✅ Workflow node saved successfully');
        } else {
          console.error('❌ onNodeUpdate is not available!');
        }
        setIsSaving(false);
      }, 1000); // 1 second debounce
    } else {
      // If the prompt is empty, clear both content and customPrompt
      if (onNodeUpdate) {
        onNodeUpdate(id, {
          nodeTitle,
          content: '',
          customPrompt: '',
          transitions
        });
      }
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [promptValue, nodeTitle, transitions, onNodeUpdate, id]);

  const handleSave = () => {
    if (onNodeUpdate) {
      onNodeUpdate(id, {
        nodeTitle,
        content: promptValue,
        customPrompt: promptValue,
        transitions
      });
    }
  };

  const handlePromptSubmit = () => {
    setIsEditingPrompt(false);
    handleSave();
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    handleSave();
  };

  const addTransition = () => {
    const newTransition: NodeTransition = {
      id: `transition-${Date.now()}`,
      label: 'New transition',
      triggerType: 'user_response'
    };
    const updatedTransitions = [...transitions, newTransition];
    setTransitions(updatedTransitions);
    if (onNodeUpdate) {
      onNodeUpdate(id, { transitions: updatedTransitions });
    }
  };

  const removeTransition = (transitionId: string) => {
    const updatedTransitions = transitions.filter(t => t.id !== transitionId);
    setTransitions(updatedTransitions);
    if (onNodeUpdate) {
      onNodeUpdate(id, { transitions: updatedTransitions });
    }
  };

  const updateTransition = (transitionId: string, label: string) => {
    const updatedTransitions = transitions.map(t =>
      t.id === transitionId ? { ...t, label } : t
    );
    setTransitions(updatedTransitions);
    if (onNodeUpdate) {
      onNodeUpdate(id, { transitions: updatedTransitions });
    }
  };

  const handleTransitionEdit = (transitionId: string, newLabel: string) => {
    updateTransition(transitionId, newLabel);
  };

  return (
    <div className={`relative bg-white rounded-xl min-w-[400px] max-w-[500px] shadow-lg border-2 ${
      selected ? 'border-rose-300' : 'border-gray-200'
    } transition-all`}>
      
      {/* Header */}
      <div className="bg-rose-50 rounded-t-xl px-4 py-3 border-b border-rose-200">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={nodeTitle}
              onChange={(e) => setNodeTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyPress={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="text-rose-700 text-lg font-semibold bg-transparent border-none outline-none focus:ring-0"
            />
          ) : (
            <h3
              className="text-rose-700 text-lg font-semibold cursor-pointer hover:text-rose-800"
              onClick={() => setIsEditingTitle(true)}
            >
              {nodeTitle}
            </h3>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Prompt Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-sm font-medium">Prompt</span>
            {isSaving && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Auto-saving...
              </div>
            )}
          </div>
          
          {isEditingPrompt ? (
            <div className="space-y-2">
              <textarea
                ref={promptTextareaRef}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onBlur={handlePromptSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handlePromptSubmit();
                  }
                }}
                className="w-full p-3 text-gray-700 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none min-h-[80px]"
                placeholder="Enter your AI assistant prompt here. Define the personality, behavior, and instructions for this conversation step. Example: 'You are a helpful customer service agent. Ask the customer how you can assist them today and listen carefully to their response.'"
                autoFocus
              />
              <div className="text-xs text-gray-500">
                Auto-save enabled • Press Ctrl+Enter to save immediately
              </div>
            </div>
          ) : (
            <div
              className="p-3 text-gray-700 text-sm bg-gray-50 rounded-lg border border-gray-200 cursor-text hover:bg-gray-100 min-h-[80px] whitespace-pre-wrap"
              onClick={() => setIsEditingPrompt(true)}
            >
              {promptValue || 'Click to add your AI assistant prompt. Example: "I am ashir, how can I help you today?"'}
            </div>
          )}
        </div>

        {/* Transition Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-sm font-medium">Transition</span>
            </div>
            <button
              onClick={addTransition}
              className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded"
              title="Add transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {transitions.map((transition) => (
              <div
                key={transition.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:bg-gray-100 min-h-[60px]">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                    <input
                      type="text"
                      value={transition.label}
                      onChange={(e) => handleTransitionEdit(transition.id, e.target.value)}
                      onBlur={handleSave}
                      className="flex-1 text-sm text-gray-700 bg-transparent border-none outline-none focus:ring-0 hover:bg-white hover:border hover:border-gray-300 rounded px-2 py-1"
                      placeholder="Transition description..."
                    />
                  </div>
                  <button
                    onClick={() => removeTransition(transition.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity flex-shrink-0"
                    title="Remove transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
            ))}
            
            {transitions.length === 0 && (
              <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-100">
                No transitions configured. Click + to add transitions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          ...inputHandleStyle,
          top: '50%',
          zIndex: 10,
        }}
      />
      
      {/* Output Handles - one for each transition */}
      {transitions.map((transition, index) => {
        // Calculate position based on component layout:
        // Header (~60px) + Prompt section (~140px) + Transition header (~40px) + transition spacing
        const baseOffset = 240; // Base offset to start of transitions
        const transitionHeight = 60; // Height of each transition element
        const transitionSpacing = 12; // space-y-3 = 12px
        const handleOffset = baseOffset + (index * (transitionHeight + transitionSpacing)) + (transitionHeight / 2);
        
        return (
          <Handle
            key={transition.id}
            type="source"
            position={Position.Right}
            id={transition.id}
            style={{ 
              ...outputHandleStyle,
              top: `${handleOffset}px`,
              zIndex: 10,
            }}
          />
        );
      })}
      
      {/* Default source handle if no transitions */}
      {transitions.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...outputHandleStyle,
            top: '50%',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export default WorkflowNode; 
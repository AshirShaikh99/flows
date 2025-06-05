'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  NodeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Save, Download, Trash2, RotateCcw, Settings } from 'lucide-react';
import NodeSidebar from './NodeSidebar';
import ConfigPanel from './ConfigPanel';
import GlobalSettingsPanel from './GlobalSettingsPanel';
import UltraVoxCallManager from './UltraVoxCallManager';
import StartNode from './nodes/StartNode';
import MessageNode from './nodes/MessageNode';
import QuestionNode from './nodes/QuestionNode';
import ConditionNode from './nodes/ConditionNode';
import WorkflowNode from './nodes/WorkflowNode';
import ConversationNode from './nodes/ConversationNode';
import { FlowNode, FlowData, NodeType, NodeData, CallStatus } from '../types';
import { useFlowContext, useCallStages } from '../lib/flow-context';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  workflow: WorkflowNode,
  conversation: ConversationNode,
  function: ConversationNode,
  call_transfer: ConversationNode,
  press_digit: ConversationNode,
  logic_split: ConversationNode,
  sms: ConversationNode,
  ending: ConversationNode,
};

const initialNodes: Node[] = [];

const FlowBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showUltraVoxPanel, setShowUltraVoxPanel] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Use Flow Context
  const { setFlowData, state } = useFlowContext();
  const { currentStageId, callStatus, transitionToStage, setCallStatus, setCallActive, stageHistory } = useCallStages();

  // UltraVox API key (in production, this should come from environment variables)
  const ultravoxApiKey = process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY || '';
  
  // Check if API key is configured
  const isApiKeyConfigured = Boolean(ultravoxApiKey && ultravoxApiKey !== 'your_ultravox_api_key_here');

  // Load saved flow on component mount
  useEffect(() => {
    const savedFlow = localStorage.getItem('conversation-flow');
    if (savedFlow) {
      try {
        const flowData: FlowData = JSON.parse(savedFlow);
        if (flowData.nodes && flowData.edges) {
          setNodes(flowData.nodes);
          setEdges(flowData.edges);
          setFlowData(flowData);
        }
      } catch (error) {
        console.error('Error loading saved flow:', error);
      }
    }
  }, [setNodes, setEdges, setFlowData]);

  // Update flow data in context when nodes or edges change
  useEffect(() => {
    const flowData: FlowData = {
      nodes: nodes as FlowNode[],
      edges: edges,
      globalPrompt: state.flowData.globalPrompt,
      ultravoxSettings: state.flowData.ultravoxSettings,
    };
    setFlowData(flowData);
  }, [nodes, edges, state.flowData.globalPrompt, state.flowData.ultravoxSettings, setFlowData]);

  // Update node styles based on current stage
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          border: node.id === currentStageId ? '4px solid #3b82f6' : '1px solid #d1d5db',
          boxShadow: node.id === currentStageId 
            ? '0 0 0 4px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(59, 130, 246, 0.3)' 
            : undefined,
          backgroundColor: node.id === currentStageId ? '#dbeafe' : undefined,
          transform: node.id === currentStageId ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.3s ease-in-out',
          zIndex: node.id === currentStageId ? 1000 : 1,
        },
        className: node.id === currentStageId ? 'active-node' : '',
      }))
    );
  }, [currentStageId, setNodes]);

  // Update edge styles to show traversed paths
  useEffect(() => {
    if (!currentStageId) return;
    
    setEdges((eds) =>
      eds.map((edge) => {
        // Check if this edge has been traversed
        const sourceIndex = stageHistory.indexOf(edge.source);
        const targetIndex = stageHistory.indexOf(edge.target);
        const isTraversed = sourceIndex !== -1 && targetIndex !== -1 && targetIndex === sourceIndex + 1;
        const isCurrentTransition = edge.target === currentStageId;
        
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isCurrentTransition 
              ? '#3b82f6' 
              : isTraversed 
                ? '#60a5fa' 
                : '#d1d5db',
            strokeWidth: isCurrentTransition ? 4 : isTraversed ? 3 : 1,
            strokeDasharray: isCurrentTransition ? '5 5' : 'none',
            opacity: isTraversed || isCurrentTransition ? 1 : 0.6,
          },
          animated: isCurrentTransition,
        };
      })
    );
  }, [currentStageId, stageHistory, setEdges]);

  // Add CSS for active node animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .active-node {
        animation: pulse-glow 2s ease-in-out infinite alternate;
      }
      
      @keyframes pulse-glow {
        0% {
          filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
        }
        100% {
          filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8));
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const getDefaultNodeData = (type: NodeType): NodeData => {
    switch (type) {
      case 'conversation':
        return { 
          content: 'Say Hello to {{customer_name}}, and ask the user if now is a good time to talk.',
          nodeTitle: 'Conversation Node',
          transitions: [
            {
              id: `transition-continue-${Date.now()}`,
              label: 'Continue conversation',
              triggerType: 'user_response'
            }
          ]
        };
      case 'function':
        return { 
          content: 'Execute custom function or API call',
          nodeTitle: 'Function Node'
        };
      case 'call_transfer':
        return { 
          content: 'Transfer call to human agent or another number',
          nodeTitle: 'Call Transfer'
        };
      case 'press_digit':
        return { 
          content: 'Wait for user to press a digit on keypad',
          nodeTitle: 'Press Digit'
        };
      case 'logic_split':
        return { 
          content: 'Branch conversation based on conditions',
          nodeTitle: 'Logic Split Node',
          condition: { operator: 'contains' as const, value: 'yes' },
          transitions: [
            {
              id: `transition-yes-${Date.now()}-1`,
              label: 'Yes',
              triggerType: 'condition_met'
            },
            {
              id: `transition-no-${Date.now()}-2`,
              label: 'No',
              triggerType: 'condition_met'
            }
          ]
        };
      case 'sms':
        return { 
          content: 'Send SMS message to user',
          nodeTitle: 'SMS'
        };
      case 'ending':
        return { 
          content: 'End the conversation gracefully',
          nodeTitle: 'Ending'
        };
      // Keep legacy support for existing node types
      case 'start':
        return { 
          nodeTitle: 'Start',
          content: ''
        };
      case 'message':
        return { 
          content: 'Thank you for your interest! Let me help you with that.',
          nodeTitle: 'Message Node'
        };
      case 'question':
        const timestamp = Date.now();
        return { 
          question: 'How can I assist you today?', 
          options: [
            { id: `option-${timestamp}-1`, text: 'I need product information' },
            { id: `option-${timestamp}-2`, text: 'I have a technical issue' },
            { id: `option-${timestamp}-3`, text: 'I want to make a purchase' }
          ],
          nodeTitle: 'Question Node'
        };
      case 'condition':
        return { 
          condition: { operator: 'contains' as const, value: 'yes' },
          nodeTitle: 'Condition Node'
        };
      case 'workflow':
        return { 
          nodeTitle: 'Welcome Node',
          content: '',
          customPrompt: '',
          transitions: [
            {
              id: `transition-reschedule-${Date.now()}-1`,
              label: 'User needs to reschedule an appointment',
              triggerType: 'user_response'
            },
            {
              id: `transition-surgery-${Date.now()}-2`,
              label: 'User is about to have a surgery, and is asking about preparations',
              triggerType: 'user_response'
            },
            {
              id: `transition-transfer-${Date.now()}-3`,
              label: 'user asks to be transferred to an agent',
              triggerType: 'user_response'
            },
            {
              id: `transition-medical-${Date.now()}-4`,
              label: 'User is having a medical condition',
              triggerType: 'user_response'
            }
          ]
        };
      default:
        return {};
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Close global settings when clicking on a node
    setShowGlobalSettings(false);
    
    // Don't show ConfigPanel for workflow nodes since they have inline editing
    if (node.type === 'workflow') {
      setSelectedNode(null);
      setShowConfigPanel(false);
      return;
    }
    
    // Don't show ConfigPanel for start nodes since they are just entry points
    if (node.type === 'start') {
      setSelectedNode(null);
      setShowConfigPanel(false);
      return;
    }
    
    setSelectedNode(node as FlowNode);
    setShowConfigPanel(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowConfigPanel(false);
  }, []);

  const onNodeUpdate = useCallback((nodeId: string, data: Partial<NodeData>) => {
    console.log('🔄 FlowBuilder onNodeUpdate called:', {
      nodeId,
      updateData: data,
      hasContent: !!data.content,
      hasCustomPrompt: !!data.customPrompt,
      contentPreview: data.content ? data.content.substring(0, 50) + '...' : 'empty',
      customPromptPreview: data.customPrompt ? data.customPrompt.substring(0, 50) + '...' : 'empty'
    });

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = { ...node, data: { ...node.data, ...data } };
          console.log('📝 Updated node data:', {
            nodeId,
            beforeUpdate: {
              content: node.data.content,
              customPrompt: node.data.customPrompt
            },
            afterUpdate: {
              content: updatedNode.data.content,
              customPrompt: updatedNode.data.customPrompt
            }
          });
          return updatedNode;
        }
        return node;
      })
    );
  }, [setNodes]);

  // Define onDrop AFTER onNodeUpdate to avoid linter error
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          ...getDefaultNodeData(type as NodeType),
          onNodeUpdate: onNodeUpdate, // Immediately add onNodeUpdate to new nodes
        },
      };

      console.log('🆕 Creating new node with onNodeUpdate:', newNode.id, 'hasOnNodeUpdate:', !!newNode.data.onNodeUpdate);
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes] // Remove onNodeUpdate from dependencies to avoid circular reference
  );

  // Add onNodeUpdate to all nodes' data so they can access it for inline editing
  useEffect(() => {
    console.log('🔧 Adding onNodeUpdate to all nodes. Node count:', nodes.length);
    setNodes((nds) =>
      nds.map((node) => {
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            onNodeUpdate: onNodeUpdate,
          },
        };
        console.log('📝 Added onNodeUpdate to node:', node.id, 'hasOnNodeUpdate:', !!updatedNode.data.onNodeUpdate);
        return updatedNode;
      })
    );
  }, [onNodeUpdate]); // Remove setNodes from dependencies to avoid infinite loop

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }, []);

  const saveFlow = useCallback(() => {
    const flowData: FlowData = {
      nodes: nodes as FlowNode[],
      edges: edges,
      globalPrompt: state.flowData.globalPrompt,
      ultravoxSettings: state.flowData.ultravoxSettings,
    };
    localStorage.setItem('conversation-flow', JSON.stringify(flowData));
    showToastMessage('Flow saved successfully!');
  }, [nodes, edges, state.flowData.globalPrompt, state.flowData.ultravoxSettings, showToastMessage]);

  const exportFlow = useCallback(() => {
    const flowData = {
      nodes: nodes as FlowNode[],
      edges,
      globalPrompt: state.flowData.globalPrompt,
      ultravoxSettings: state.flowData.ultravoxSettings,
    };
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'conversation-flow.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges, state.flowData.globalPrompt, state.flowData.ultravoxSettings]);

  const clearFlow = useCallback(() => {
    if (confirm('Are you sure you want to clear the entire flow? This action cannot be undone.')) {
      setNodes(initialNodes);
      setEdges([]);
      setSelectedNode(null);
      setShowConfigPanel(false);
      localStorage.removeItem('conversation-flow');
    }
  }, [setNodes, setEdges]);

  const resetView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [reactFlowInstance]);

  // Handle stage changes from UltraVox
  const handleStageChange = useCallback((nodeId: string) => {
    console.log('🔄 FlowBuilder: Stage changed to:', nodeId);
    transitionToStage(nodeId);
  }, [transitionToStage]);

  // Handle call status changes
  const handleCallStatusChange = useCallback((status: CallStatus) => {
    console.log('📊 FlowBuilder: Call status changed to:', status);
    setCallStatus(status);
    setCallActive(status === 'STATUS_ACTIVE');
    
    // AUTO-REGISTER FLOW DATA: When call becomes active, ensure flow data is registered
    if (status === 'STATUS_ACTIVE' && nodes.length > 0) {
      const flowData: FlowData = {
        nodes: nodes as FlowNode[],
        edges: edges,
        globalPrompt: state.flowData.globalPrompt,
        ultravoxSettings: state.flowData.ultravoxSettings,
      };
      
      // Register with both placeholder and any active call IDs
      const registerFlowForCall = async () => {
        try {
          // Register with common placeholder ID used by navigation
          const response = await fetch('/api/flow/navigate', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              callId: 'call-1234567890', 
              flowData 
            })
          });
          
          if (response.ok) {
            console.log('✅ Flow data auto-registered for active call');
            showToastMessage('Flow synchronized with active call');
          } else {
            console.warn('⚠️ Failed to auto-register flow data');
          }
        } catch (error) {
          console.warn('⚠️ Error auto-registering flow data:', error);
        }
      };
      
      registerFlowForCall();
    }
  }, [setCallStatus, setCallActive, nodes, edges, state.flowData.globalPrompt, state.flowData.ultravoxSettings, showToastMessage]);

  return (
    <div className="flex h-screen bg-gray-100">
      <NodeSidebar onDragStart={onDragStart} />
      
      <div className="flex-1 relative">
        {/* Top toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-3">
          <button
            onClick={saveFlow}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Save Flow"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={exportFlow}
            className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Export Flow"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={() => setShowGlobalSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Global Settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          
          <button
            onClick={resetView}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
            Reset View
          </button>
          
          <button
            onClick={clearFlow}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Clear Flow"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>

        {/* UltraVox Panel Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setShowUltraVoxPanel(!showUltraVoxPanel)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
              showUltraVoxPanel
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {showUltraVoxPanel ? 'Hide' : 'Show'} Call Manager
          </button>
        </div>

        {/* Current Stage Indicator */}
        {currentStageId && (
          <div className="absolute top-16 right-4 z-10 bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-3 shadow-lg">
            <div className="text-sm font-bold text-blue-900 mb-1">
              🎯 Active Node: {currentStageId}
            </div>
            <div className="text-xs text-blue-700 mb-2">
              Status: {callStatus.replace('STATUS_', '')}
            </div>
            {(() => {
              const activeNode = (nodes as FlowNode[]).find(n => n.id === currentStageId);
              return activeNode ? (
                <div className="text-xs text-blue-600">
                  <div className="font-medium">Type: {activeNode.type}</div>
                  {activeNode.data.customPrompt && (
                    <div className="mt-1 text-blue-500">
                      📝 Custom: {activeNode.data.customPrompt.substring(0, 30)}...
                    </div>
                  )}
                  {activeNode.data.content && !activeNode.data.customPrompt && (
                    <div className="mt-1 text-blue-500">
                      💬 Content: {activeNode.data.content.substring(0, 30)}...
                    </div>
                  )}
                </div>
              ) : null;
            })()}
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
              Flow is active
            </div>
          </div>
        )}

        <div
          ref={reactFlowWrapper}
          className="w-full h-full"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfigPanel && selectedNode && (
        <ConfigPanel
          selectedNode={selectedNode}
          nodes={nodes as FlowNode[]}
          onNodeUpdate={onNodeUpdate}
          onClose={() => setShowConfigPanel(false)}
        />
      )}

      {/* Global Settings Panel */}
      {showGlobalSettings && (
        <GlobalSettingsPanel
          onClose={() => setShowGlobalSettings(false)}
        />
      )}

      {/* UltraVox Call Manager Panel */}
      {showUltraVoxPanel && (
        <div className="absolute top-20 right-4 z-20 w-96">
          {isApiKeyConfigured ? (
            <UltraVoxCallManager
              apiKey={ultravoxApiKey}
              onCallStatusChange={handleCallStatusChange}
              onStageChange={handleStageChange}
            />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                UltraVox API Key Required
              </h3>
              <p className="text-sm text-yellow-700">
                Please set your NEXT_PUBLIC_ULTRAVOX_API_KEY environment variable to use the call manager.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-rose-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
          <span className="text-gray-700 font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

const FlowBuilderWithProvider: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
};

export default FlowBuilderWithProvider; 
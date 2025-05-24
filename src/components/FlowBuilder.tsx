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

import { Save, Download, Trash2, RotateCcw } from 'lucide-react';
import NodeSidebar from './NodeSidebar';
import ConfigPanel from './ConfigPanel';
import UltraVoxCallManager from './UltraVoxCallManager';
import StartNode from './nodes/StartNode';
import MessageNode from './nodes/MessageNode';
import QuestionNode from './nodes/QuestionNode';
import ConditionNode from './nodes/ConditionNode';
import { FlowNode, FlowData, NodeType, NodeData, CallStatus } from '../types';
import { useFlowContext, useCallStages } from '../lib/flow-context';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
};

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { label: 'Start' },
    deletable: false,
  },
];

const FlowBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showUltraVoxPanel, setShowUltraVoxPanel] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Use Flow Context
  const { setFlowData } = useFlowContext();
  const { currentStageId, callStatus, transitionToStage, setCallStatus, setCallActive } = useCallStages();

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
    };
    setFlowData(flowData);
  }, [nodes, edges, setFlowData]);

  // Update node styles based on current stage
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          border: node.id === currentStageId ? '3px solid #3b82f6' : '1px solid #d1d5db',
          boxShadow: node.id === currentStageId ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : undefined,
          backgroundColor: node.id === currentStageId ? '#eff6ff' : undefined,
        },
      }))
    );
  }, [currentStageId, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

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
        data: getDefaultNodeData(type as NodeType),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const getDefaultNodeData = (type: NodeType): NodeData => {
    switch (type) {
      case 'message':
        return { content: '' };
      case 'question':
        return { question: '', options: [] };
      case 'condition':
        return { condition: { operator: 'equals', value: '' } };
      default:
        return {};
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as FlowNode);
    setShowConfigPanel(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowConfigPanel(false);
  }, []);

  const onNodeUpdate = useCallback((nodeId: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, [setNodes]);

  const saveFlow = useCallback(() => {
    const flowData: FlowData = {
      nodes: nodes as FlowNode[],
      edges: edges,
    };
    localStorage.setItem('conversation-flow', JSON.stringify(flowData));
    alert('Flow saved successfully!');
  }, [nodes, edges]);

  const exportFlow = useCallback(() => {
    const flowData = {
      nodes: nodes as FlowNode[],
      edges,
    };
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'conversation-flow.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);

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
  }, [setCallStatus, setCallActive]);

  return (
    <div className="flex h-screen bg-gray-100">
      <NodeSidebar onDragStart={onDragStart} />
      
      <div className="flex-1 relative">
        {/* Top toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={saveFlow}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            title="Save Flow"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={exportFlow}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            title="Export Flow"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={resetView}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
            Reset View
          </button>
          
          <button
            onClick={clearFlow}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
            className={`px-4 py-2 rounded-md transition-colors ${
              showUltraVoxPanel
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showUltraVoxPanel ? 'Hide' : 'Show'} Call Manager
          </button>
        </div>

        {/* Current Stage Indicator */}
        {currentStageId && (
          <div className="absolute top-16 right-4 z-10 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2">
            <div className="text-sm font-medium text-blue-900">
              Active Stage: {currentStageId}
            </div>
            <div className="text-xs text-blue-700">
              Status: {callStatus.replace('STATUS_', '')}
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

      {/* UltraVox Call Manager Panel */}
      {showUltraVoxPanel && (
        <div className="absolute top-20 right-4 z-20 w-96">
          {isApiKeyConfigured ? (
            <UltraVoxCallManager
              flowData={{ nodes: nodes as FlowNode[], edges }}
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
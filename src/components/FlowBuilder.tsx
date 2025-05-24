'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
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
  const [callStatus, setCallStatus] = useState<CallStatus>('STATUS_UNSPECIFIED');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // UltraVox API key (in production, this should come from environment variables)
  const ultravoxApiKey = process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY || '';

  // Load saved flow on component mount
  useEffect(() => {
    const savedFlow = localStorage.getItem('conversation-flow');
    if (savedFlow) {
      try {
        const flowData: FlowData = JSON.parse(savedFlow);
        if (flowData.nodes && flowData.edges) {
          setNodes(flowData.nodes);
          setEdges(flowData.edges);
        }
      } catch (error) {
        console.error('Error loading saved flow:', error);
      }
    }
  }, [setNodes, setEdges]);

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
      edges: edges as Edge[],
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

  return (
    <div className="flex h-screen bg-gray-100">
      <NodeSidebar onDragStart={onDragStart} />
      
      <div className="flex-1 relative">
        {/* Top toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={saveFlow}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={exportFlow}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={resetView}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset View
          </button>
          <button
            onClick={clearFlow}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={() => setShowUltraVoxPanel(!showUltraVoxPanel)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md transition-colors ${
              showUltraVoxPanel 
                ? 'bg-purple-700 text-white' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            🎤 UltraVox
          </button>
        </div>

        {/* UltraVox Panel */}
        {showUltraVoxPanel && (
          <div className="absolute top-20 left-4 z-10 w-80">
            <UltraVoxCallManager
              flowData={{ nodes: nodes as FlowNode[], edges }}
              apiKey={ultravoxApiKey}
              onCallStatusChange={setCallStatus}
              onStageChange={setCurrentNodeId}
            />
          </div>
        )}

        {/* Current Stage Indicator */}
        {currentNodeId && callStatus === 'STATUS_ACTIVE' && (
          <div className="absolute bottom-4 left-4 z-10 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-md">
            <div className="text-xs opacity-75">Current Node:</div>
            <div className="font-medium">{currentNodeId}</div>
          </div>
        )}

        <div className="w-full h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            attributionPosition="bottom-left"
          >
            <Controls />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </div>
      </div>

      {showConfigPanel && (
        <ConfigPanel
          selectedNode={selectedNode}
          nodes={nodes as FlowNode[]}
          onNodeUpdate={onNodeUpdate}
          onClose={() => setShowConfigPanel(false)}
        />
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
export interface FlowNode {
  id: string;
  type: 'start' | 'message' | 'question' | 'condition';
  position: { x: number; y: number };
  data: NodeData;
}

export interface NodeData {
  label?: string;
  content?: string;
  question?: string;
  options?: ResponseOption[];
  condition?: Condition;
}

export interface ResponseOption {
  id: string;
  text: string;
}

export interface Condition {
  questionNodeId?: string;
  operator: 'equals' | 'contains';
  value: string;
}

import { ReactNode } from 'react';

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: ReactNode;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type NodeType = 'start' | 'message' | 'question' | 'condition'; 
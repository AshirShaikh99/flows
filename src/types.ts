export type NodeType = 'start' | 'message' | 'question' | 'condition' | 'workflow' | 'conversation' | 'function' | 'call_transfer' | 'press_digit' | 'logic_split' | 'sms' | 'ending';

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface NodeData {
  label?: string;
  content?: string;
  customPrompt?: string;
  question?: string;
  options?: ResponseOption[];
  condition?: Condition;
  nodeTitle?: string;
  systemPrompt?: string;
  transitions?: NodeTransition[];
  description?: string;
  onNodeUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
}

export interface NodeTransition {
  id: string;
  label: string;
  condition?: string;
  targetNodeId?: string;
  triggerType: 'user_response' | 'condition_met' | 'timeout' | 'manual';
}

export interface ResponseOption {
  id: string;
  text: string;
  targetNodeId?: string;
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
  globalPrompt?: string;
}

// UltraVox Integration Types
export interface UltraVoxCallStage {
  callId: string;
  callStageId: string;
  created: string;
  model: string;
  systemPrompt: string;
  voice: string;
  temperature: number;
  languageHint?: string;
  timeExceededMessage?: string;
  inactivityMessages?: InactivityMessage[];
  errorCount: number;
  experimentalSettings?: unknown;
  initialState: Record<string, unknown>;
  externalVoice?: ExternalVoice;
}

export interface InactivityMessage {
  duration: string;
  message: string;
  endBehavior?: 'END_BEHAVIOR_UNSPECIFIED' | 'END_BEHAVIOR_HANG_UP_SOFT' | 'END_BEHAVIOR_HANG_UP_HARD';
}

export interface ExternalVoice {
  elevenLabs?: ElevenLabsVoice;
  cartesia?: CartesiaVoice;
  playHt?: PlayHtVoice;
  lmnt?: LmntVoice;
  generic?: GenericVoice;
}

export interface ElevenLabsVoice {
  voiceId: string;
  model?: string;
  speed?: number;
  useSpeakerBoost?: boolean;
  style?: number;
  similarityBoost?: number;
  stability?: number;
}

export interface CartesiaVoice {
  voiceId: string;
  model?: string;
  speed?: number;
  emotion?: string;
  emotions?: string[];
}

export interface PlayHtVoice {
  userId: string;
  voiceId: string;
  model?: string;
  speed?: number;
  quality?: string;
  temperature?: number;
  emotion?: number;
  voiceGuidance?: number;
  styleGuidance?: number;
  textGuidance?: number;
  voiceConditioningSeconds?: number;
}

export interface LmntVoice {
  voiceId: string;
  model?: string;
  speed?: number;
  conversational?: boolean;
}

export interface GenericVoice {
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  responseSampleRate?: number;
  responseWordsPerMinute?: number;
  responseMimeType?: string;
}

export interface UltraVoxCall {
  callId: string;
  created: string;
  ended?: string;
  model: string;
  systemPrompt: string;
  voice: string;
  temperature: number;
  maxDuration?: string;
  timeExceededMessage?: string;
  inactivityMessages?: InactivityMessage[];
  joinUrl: string;
  medium: CallMedium;
  firstSpeaker: 'FIRST_SPEAKER_UNSPECIFIED' | 'FIRST_SPEAKER_AGENT' | 'FIRST_SPEAKER_USER';
  status: CallStatus;
  metadata?: Record<string, unknown>;
  stages?: UltraVoxCallStage[];
}

export interface CallMedium {
  twilio?: Record<string, unknown>;
  telnyx?: Record<string, unknown>;
  plivo?: Record<string, unknown>;
  sip?: {
    incoming?: Record<string, unknown>;
    outgoing?: Record<string, unknown>;
  };
  serverWebSocket?: {
    inputSampleRate: number;
    outputSampleRate: number;
  };
}

export type CallStatus = 
  | 'STATUS_UNSPECIFIED'
  | 'STATUS_STARTING'
  | 'STATUS_ACTIVE'
  | 'STATUS_ENDED'
  | 'STATUS_FAILED';

export interface FlowExecutionContext {
  flowData: FlowData;
  currentNodeId: string;
  variables: Record<string, unknown>;
  callStageHistory: string[];
  ultravoxCall?: UltraVoxCall;
}

export interface StageTransition {
  fromStageId?: string;
  toNodeId: string;
  trigger: 'user_response' | 'condition_met' | 'tool_call' | 'timeout';
  data?: unknown;
}

export interface FlowStageMapping {
  nodeId: string;
  stageConfig: Partial<UltraVoxCallStage>;
  tools?: SelectedTool[];
}

export interface SelectedTool {
  toolName?: string;
  toolId?: string;
  temporaryTool?: TemporaryTool;
  parameterOverrides?: Record<string, unknown>;
}

export interface TemporaryTool {
  modelToolName: string;
  description: string;
  dynamicParameters: DynamicParameter[];
  http: HttpConfig;
}

// JSON Schema type for better type safety
export interface JsonSchema {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  description?: string;
  enum?: (string | number)[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  [key: string]: unknown;
}

export interface DynamicParameter {
  name: string;
  location: 'PARAMETER_LOCATION_BODY' | 'PARAMETER_LOCATION_QUERY' | 'PARAMETER_LOCATION_PATH' | 'PARAMETER_LOCATION_HEADER';
  schema: JsonSchema;
  required: boolean;
}

export interface HttpConfig {
  baseUrlPattern: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
} 
'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { FlowData, FlowNode, CallStatus, UltraVoxCallStage } from '../types';

// Flow State Interface
interface FlowState {
  flowData: FlowData;
  currentStageId: string | null;
  stageHistory: string[];
  callStatus: CallStatus;
  isCallActive: boolean;
  currentStages: UltraVoxCallStage[];
  variables: Record<string, unknown>;
}

// Flow Actions
type FlowAction =
  | { type: 'SET_FLOW_DATA'; payload: FlowData }
  | { type: 'SET_CURRENT_STAGE'; payload: string }
  | { type: 'ADD_STAGE_TO_HISTORY'; payload: string }
  | { type: 'SET_CALL_STATUS'; payload: CallStatus }
  | { type: 'SET_CALL_ACTIVE'; payload: boolean }
  | { type: 'SET_CURRENT_STAGES'; payload: UltraVoxCallStage[] }
  | { type: 'UPDATE_VARIABLES'; payload: Record<string, unknown> }
  | { type: 'RESET_FLOW_STATE' };

// Initial State
const initialState: FlowState = {
  flowData: { nodes: [], edges: [] },
  currentStageId: null,
  stageHistory: [],
  callStatus: 'STATUS_UNSPECIFIED',
  isCallActive: false,
  currentStages: [],
  variables: {},
};

// Flow Reducer
function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'SET_FLOW_DATA':
      return {
        ...state,
        flowData: action.payload,
      };
    
    case 'SET_CURRENT_STAGE':
      return {
        ...state,
        currentStageId: action.payload,
      };
    
    case 'ADD_STAGE_TO_HISTORY':
      return {
        ...state,
        stageHistory: [...state.stageHistory, action.payload],
      };
    
    case 'SET_CALL_STATUS':
      return {
        ...state,
        callStatus: action.payload,
      };
    
    case 'SET_CALL_ACTIVE':
      return {
        ...state,
        isCallActive: action.payload,
      };
    
    case 'SET_CURRENT_STAGES':
      return {
        ...state,
        currentStages: action.payload,
      };
    
    case 'UPDATE_VARIABLES':
      return {
        ...state,
        variables: { ...state.variables, ...action.payload },
      };
    
    case 'RESET_FLOW_STATE':
      return {
        ...initialState,
        flowData: state.flowData, // Keep flow data but reset everything else
      };
    
    default:
      return state;
  }
}

// Context Interface
interface FlowContextType {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
  
  // Helper functions
  setFlowData: (flowData: FlowData) => void;
  transitionToStage: (stageId: string) => void;
  setCallStatus: (status: CallStatus) => void;
  setCallActive: (active: boolean) => void;
  updateVariables: (variables: Record<string, unknown>) => void;
  resetFlow: () => void;
  
  // Getters
  getCurrentNode: () => FlowNode | null;
  getNodeById: (id: string) => FlowNode | null;
  isNodeActive: (nodeId: string) => boolean;
}

// Create Context
const FlowContext = createContext<FlowContextType | undefined>(undefined);

// Context Provider Props
interface FlowProviderProps {
  children: ReactNode;
}

// Context Provider Component
export function FlowProvider({ children }: FlowProviderProps) {
  const [state, dispatch] = useReducer(flowReducer, initialState);

  // Helper functions
  const setFlowData = useCallback((flowData: FlowData) => {
    dispatch({ type: 'SET_FLOW_DATA', payload: flowData });
  }, []);

  const transitionToStage = useCallback((stageId: string) => {
    console.log('🔄 Context: Transitioning to stage:', stageId);
    dispatch({ type: 'SET_CURRENT_STAGE', payload: stageId });
    dispatch({ type: 'ADD_STAGE_TO_HISTORY', payload: stageId });
  }, []);

  const setCallStatus = useCallback((status: CallStatus) => {
    dispatch({ type: 'SET_CALL_STATUS', payload: status });
  }, []);

  const setCallActive = useCallback((active: boolean) => {
    dispatch({ type: 'SET_CALL_ACTIVE', payload: active });
  }, []);

  const updateVariables = useCallback((variables: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_VARIABLES', payload: variables });
  }, []);

  const resetFlow = useCallback(() => {
    dispatch({ type: 'RESET_FLOW_STATE' });
  }, []);

  // Getters
  const getCurrentNode = useCallback((): FlowNode | null => {
    if (!state.currentStageId) return null;
    return state.flowData.nodes.find(node => node.id === state.currentStageId) || null;
  }, [state.currentStageId, state.flowData.nodes]);

  const getNodeById = useCallback((id: string): FlowNode | null => {
    return state.flowData.nodes.find(node => node.id === id) || null;
  }, [state.flowData.nodes]);

  const isNodeActive = useCallback((nodeId: string): boolean => {
    return state.currentStageId === nodeId;
  }, [state.currentStageId]);

  const contextValue: FlowContextType = {
    state,
    dispatch,
    setFlowData,
    transitionToStage,
    setCallStatus,
    setCallActive,
    updateVariables,
    resetFlow,
    getCurrentNode,
    getNodeById,
    isNodeActive,
  };

  return (
    <FlowContext.Provider value={contextValue}>
      {children}
    </FlowContext.Provider>
  );
}

// Custom Hook to use Flow Context
export function useFlowContext(): FlowContextType {
  const context = useContext(FlowContext);
  if (context === undefined) {
    throw new Error('useFlowContext must be used within a FlowProvider');
  }
  return context;
}

// Hook for Call Stages specific functionality
export function useCallStages() {
  const { state, transitionToStage, setCallStatus, setCallActive, resetFlow } = useFlowContext();
  
  return {
    currentStageId: state.currentStageId,
    stageHistory: state.stageHistory,
    callStatus: state.callStatus,
    isCallActive: state.isCallActive,
    currentStages: state.currentStages,
    variables: state.variables,
    
    // Actions
    transitionToStage,
    setCallStatus,
    setCallActive,
    resetFlow,
  };
}

// Hook for Flow Data management
export function useFlowData() {
  const { state, setFlowData, getNodeById, getCurrentNode, isNodeActive } = useFlowContext();
  
  return {
    flowData: state.flowData,
    nodes: state.flowData.nodes,
    edges: state.flowData.edges,
    
    // Actions
    setFlowData,
    
    // Getters
    getNodeById,
    getCurrentNode,
    isNodeActive,
  };
} 
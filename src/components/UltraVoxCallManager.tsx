'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, MapPin } from 'lucide-react';
import { FlowData, CallStatus } from '../types';
import { getUltraVoxService } from '../lib/ultravox';

interface UltraVoxCallManagerProps {
  flowData: FlowData;
  apiKey: string;
  onCallStatusChange?: (status: CallStatus) => void;
  onStageChange?: (nodeId: string) => void;
}

export default function UltraVoxCallManager({ 
  flowData, 
  apiKey, 
  onCallStatusChange,
  onStageChange 
}: UltraVoxCallManagerProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('STATUS_UNSPECIFIED');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [stageHistory, setStageHistory] = useState<string[]>([]);

  const ultravoxServiceRef = useRef<ReturnType<typeof getUltraVoxService> | null>(null);

  // Initialize UltraVox service
  useEffect(() => {
    try {
      ultravoxServiceRef.current = getUltraVoxService(apiKey);
      
      // Set up stage change callback
      ultravoxServiceRef.current.setStageChangeCallback((nodeId: string) => {
        console.log('🔄 Stage changed to:', nodeId);
        setCurrentStageId(nodeId);
        setStageHistory(prev => [...prev, nodeId]);
        onStageChange?.(nodeId);
        
        // Add debug message about stage change
        setDebugMessages(prev => [...prev, `Stage changed to: ${nodeId}`]);
      });
    } catch (err) {
      setError('Failed to initialize UltraVox service');
      console.error('UltraVox initialization error:', err);
    }
  }, [apiKey, onStageChange]);

  // Setup event listeners for session events
  useEffect(() => {
    if (!ultravoxServiceRef.current) return;

    const currentSession = ultravoxServiceRef.current.getCurrentSession();
    if (!currentSession) return;

    // Handle transcript updates
    const handleTranscriptUpdate = () => {
      const sessionTranscripts = currentSession.transcripts;
      if (sessionTranscripts && sessionTranscripts.length > 0) {
        const transcriptTexts = sessionTranscripts.map(t => `${t.speaker}: ${t.text}`);
        setTranscripts(transcriptTexts);
      }
    };

    // Handle status changes
    const handleStatusUpdate = () => {
      const sessionStatus = currentSession.status;
      console.log('📊 Session status update:', sessionStatus);
      
      // Map UltraVox session status to our call status
      switch (sessionStatus) {
        case 'connecting':
          setCallStatus('STATUS_STARTING');
          onCallStatusChange?.('STATUS_STARTING');
          break;
        case 'idle':
        case 'listening':
        case 'thinking':
        case 'speaking':
          setCallStatus('STATUS_ACTIVE');
          onCallStatusChange?.('STATUS_ACTIVE');
          break;
        case 'disconnected':
        case 'disconnecting':
          setCallStatus('STATUS_ENDED');
          setIsCallActive(false);
          onCallStatusChange?.('STATUS_ENDED');
          break;
        default:
          console.log('Unknown session status:', sessionStatus);
      }
    };

    // Handle debug messages
    const handleDebugMessage = (event: Event) => {
      const experimentalEvent = event as { message?: unknown };
      const message = experimentalEvent.message || event;
      setDebugMessages(prev => [...prev.slice(-9), JSON.stringify(message)]);
    };

    // Add event listeners
    currentSession.addEventListener('transcripts', handleTranscriptUpdate);
    currentSession.addEventListener('status', handleStatusUpdate);
    currentSession.addEventListener('experimental_message', handleDebugMessage);

    // Cleanup
    return () => {
      currentSession.removeEventListener('transcripts', handleTranscriptUpdate);
      currentSession.removeEventListener('status', handleStatusUpdate);
      currentSession.removeEventListener('experimental_message', handleDebugMessage);
    };
  }, [isCallActive, onCallStatusChange]);

  const startCall = useCallback(async () => {
    if (!ultravoxServiceRef.current || !flowData.nodes.length) {
      setError('UltraVox service not initialized or no flow data');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscripts([]);
    setDebugMessages([]);
    setStageHistory([]);

    try {
      console.log('🚀 Starting UltraVox call with flow data...');
      
      // DEBUG: Log the actual flow data being used
      console.log('🔍 FLOW DATA DEBUG:', {
        nodeCount: flowData.nodes.length,
        edgeCount: flowData.edges.length,
        nodes: flowData.nodes.map(n => ({
          id: n.id,
          type: n.type,
          hasContent: !!n.data.content,
          hasCustomPrompt: !!n.data.customPrompt,
          content: n.data.content?.substring(0, 50) + '...',
          customPrompt: n.data.customPrompt?.substring(0, 50) + '...',
          nodeTitle: n.data.nodeTitle
        }))
      });
      
      // Find start node
      const startNode = flowData.nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('No start node found in flow');
      }

      // Find workflow node to check its content
      const workflowNode = flowData.nodes.find(n => n.type === 'workflow');
      if (workflowNode) {
        console.log('🎯 WORKFLOW NODE DATA:', {
          id: workflowNode.id,
          nodeTitle: workflowNode.data.nodeTitle,
          content: workflowNode.data.content,
          customPrompt: workflowNode.data.customPrompt,
          hasContent: !!workflowNode.data.content,
          hasCustomPrompt: !!workflowNode.data.customPrompt
        });
      }

      // Set initial stage
      setCurrentStageId(startNode.id);
      setStageHistory([startNode.id]);
      
      // Create call
      const call = await ultravoxServiceRef.current.createCall(flowData);
      console.log('✅ Call created:', call.callId);
      
      // Join call
      await ultravoxServiceRef.current.joinCall(call.joinUrl);
      console.log('✅ Joined call successfully');
      
      setIsCallActive(true);
      setCallStatus('STATUS_ACTIVE');
      onCallStatusChange?.('STATUS_ACTIVE');
      
      setDebugMessages(prev => [...prev, 
        `Call created: ${call.callId}`,
        `Started at node: ${startNode.id} (${startNode.type})`,
        workflowNode ? `Workflow: ${workflowNode.data.customPrompt || workflowNode.data.content || 'empty'}` : 'No workflow node',
        'Call is now active'
      ]);

    } catch (err) {
      console.error('❌ Failed to start call:', err);
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setCallStatus('STATUS_FAILED');
      onCallStatusChange?.('STATUS_FAILED');
    } finally {
      setIsLoading(false);
    }
  }, [flowData, onCallStatusChange]);

  const endCall = useCallback(async () => {
    if (!ultravoxServiceRef.current) return;

    // Immediately update UI state to show ending
    setCallStatus('STATUS_ENDED');
    setIsCallActive(false);
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔚 User requested to end call');
      await ultravoxServiceRef.current.endCall();
      
      // Clean up UI state
      setTranscripts([]);
      setDebugMessages([]);
      
      console.log('✅ Call ended successfully');

    } catch (err) {
      console.error('❌ Failed to end call:', err);
      // Don't show error to user since call is ending anyway
    } finally {
      setIsLoading(false);
      
      // Ensure UI state is clean regardless of any errors
      setCallStatus('STATUS_ENDED');
      setIsCallActive(false);
      setCurrentStageId(null);
      setStageHistory([]);
    }
  }, [onCallStatusChange]);

  const toggleMic = useCallback(() => {
    const session = ultravoxServiceRef.current?.getCurrentSession();
    if (!session) return;

    if (isMicMuted) {
      session.unmuteMic();
      setIsMicMuted(false);
    } else {
      session.muteMic();
      setIsMicMuted(true);
    }
  }, [isMicMuted]);

  const toggleSpeaker = useCallback(() => {
    const session = ultravoxServiceRef.current?.getCurrentSession();
    if (!session) return;

    if (isSpeakerMuted) {
      session.unmuteSpeaker();
      setIsSpeakerMuted(false);
    } else {
      session.muteSpeaker();
      setIsSpeakerMuted(true);
    }
  }, [isSpeakerMuted]);

  const getCurrentNodeInfo = () => {
    if (!currentStageId) return null;
    return flowData.nodes.find(n => n.id === currentStageId);
  };

  const getStatusColor = (status: CallStatus) => {
    switch (status) {
      case 'STATUS_STARTING': return 'text-yellow-600';
      case 'STATUS_ACTIVE': return 'text-green-600';
      case 'STATUS_ENDED': return 'text-gray-600';
      case 'STATUS_FAILED': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: CallStatus) => {
    switch (status) {
      case 'STATUS_STARTING': return 'Starting...';
      case 'STATUS_ACTIVE': return 'Active';
      case 'STATUS_ENDED': return 'Ended';
      case 'STATUS_FAILED': return 'Failed';
      default: return 'Unknown';
    }
  };

  const currentNode = getCurrentNodeInfo();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Call Manager</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${callStatus === 'STATUS_ACTIVE' ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-sm font-medium ${getStatusColor(callStatus)}`}>
            {getStatusText(callStatus)}
          </span>
        </div>
      </div>

      {/* Current Stage Indicator */}
      {currentNode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Current Stage:</span>
            <span className="text-sm text-blue-700">
              {currentNode.data?.label || currentNode.type} ({currentNode.id})
            </span>
          </div>
          {currentNode.data?.content && (
            <p className="text-xs text-blue-600 mt-1">{currentNode.data.content}</p>
          )}
        </div>
      )}

      {/* Stage History */}
      {stageHistory.length > 1 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Stage History:</h4>
          <div className="flex flex-wrap gap-1">
            {stageHistory.map((stageId, index) => {
              const node = flowData.nodes.find(n => n.id === stageId);
              return (
                <span
                  key={`${stageId}-${index}`}
                  className={`px-2 py-1 text-xs rounded ${
                    index === stageHistory.length - 1
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {node?.data?.label || node?.type || stageId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isCallActive ? (
          <button
            onClick={startCall}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                <span>Start Call</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={toggleMic}
              className={`p-3 rounded-lg transition-colors ${
                isMicMuted
                  ? 'bg-red-100 hover:bg-red-200 text-red-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-lg transition-colors ${
                isSpeakerMuted
                  ? 'bg-red-100 hover:bg-red-200 text-red-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={endCall}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </>
        )}
      </div>

      {/* Transcripts */}
      {transcripts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Conversation:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {transcripts.map((transcript, index) => (
              <p key={index} className="text-xs text-gray-600">
                {transcript}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Debug Messages */}
      {debugMessages.length > 0 && (
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">
            Debug Messages ({debugMessages.length})
          </summary>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {debugMessages.map((message, index) => (
              <p key={index} className="text-xs text-gray-500 font-mono">
                {message}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
} 
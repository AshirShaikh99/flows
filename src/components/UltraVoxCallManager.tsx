'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Play, Square } from 'lucide-react';
import { FlowData, UltraVoxCall, CallStatus } from '../types';
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
  const [currentCall, setCurrentCall] = useState<UltraVoxCall | null>(null);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const ultravoxServiceRef = useRef<ReturnType<typeof getUltraVoxService> | null>(null);

  // Initialize UltraVox service
  useEffect(() => {
    try {
      ultravoxServiceRef.current = getUltraVoxService(apiKey);
    } catch (err) {
      setError('Failed to initialize UltraVox service');
      console.error('UltraVox initialization error:', err);
    }
  }, [apiKey]);

  const startCall = useCallback(async () => {
    if (!ultravoxServiceRef.current) {
      setError('UltraVox service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check microphone permissions first
      console.log('Checking microphone permissions...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up
        console.log('Microphone permission granted');
      } catch (permError) {
        console.warn('Microphone permission denied or not available:', permError);
        setError('Microphone access is required for voice calls. Please allow microphone access and try again.');
        return;
      }

      // Validate flow data
      if (!flowData.nodes.length) {
        throw new Error('Flow must have at least one node');
      }

      const startNode = flowData.nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('Flow must have a start node');
      }

      // Create the call
      const call = await ultravoxServiceRef.current.createCall(flowData);
      console.log('Call created successfully:', call);
      setCurrentCall(call);
      setCallStatus('STATUS_STARTING');
      onCallStatusChange?.('STATUS_STARTING');

      // Join the call
      console.log('About to join call with URL:', call.joinUrl);
      await ultravoxServiceRef.current.joinCall(call.joinUrl);
      console.log('Join call completed');
      
      setIsCallActive(true);
      setCallStatus('STATUS_ACTIVE');
      onCallStatusChange?.('STATUS_ACTIVE');
      onStageChange?.(startNode.id);

      console.log('Call started successfully:', call);

    } catch (err) {
      console.error('Failed to start call:', err);
      
      // Extract detailed error information
      let errorMessage = 'Failed to start call';
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // If the error contains API response details, parse them
        if (err.message.includes('Bad Request') && err.message.includes('{')) {
          try {
            const errorMatch = err.message.match(/\{.*\}/);
            if (errorMatch) {
              const errorDetails = JSON.parse(errorMatch[0]);
                             if (errorDetails.details && typeof errorDetails.details === 'string') {
                 errorMessage = `UltraVox API Error: ${errorDetails.details}`;
               }
            }
          } catch (parseError) {
            // If parsing fails, keep the original error message
            console.warn('Could not parse error details:', parseError);
          }
        }
      }
      
      setError(errorMessage);
      setCallStatus('STATUS_FAILED');
      onCallStatusChange?.('STATUS_FAILED');
    } finally {
      setIsLoading(false);
    }
  }, [flowData, onCallStatusChange, onStageChange]);

  const endCall = useCallback(async () => {
    if (!ultravoxServiceRef.current) return;

    // Immediately update UI state to show ending
    setCallStatus('STATUS_ENDED');
    setIsCallActive(false);
    setCurrentCall(null);
    onCallStatusChange?.('STATUS_ENDED');
    
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
      // setError(err instanceof Error ? err.message : 'Failed to end call');
    } finally {
      setIsLoading(false);
      
      // Ensure UI state is clean regardless of any errors
      setCallStatus('STATUS_ENDED');
      setIsCallActive(false);
      setCurrentCall(null);
      setTranscripts([]);
      setDebugMessages([]);
      onCallStatusChange?.('STATUS_ENDED');
    }
  }, [onCallStatusChange]);

  const toggleMic = useCallback(() => {
    // Note: These would integrate with the actual UltraVox session methods
    // For now, we'll just update the UI state
    setIsMicMuted(!isMicMuted);
    console.log(`Microphone ${!isMicMuted ? 'muted' : 'unmuted'}`);
  }, [isMicMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerMuted(!isSpeakerMuted);
    console.log(`Speaker ${!isSpeakerMuted ? 'muted' : 'unmuted'}`);
  }, [isSpeakerMuted]);



  // Status indicator color
  const getStatusColor = (status: CallStatus) => {
    switch (status) {
      case 'STATUS_ACTIVE': return 'bg-green-500';
      case 'STATUS_STARTING': return 'bg-yellow-500';
      case 'STATUS_ENDED': return 'bg-gray-500';
      case 'STATUS_FAILED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: CallStatus) => {
    switch (status) {
      case 'STATUS_ACTIVE': return 'Active';
      case 'STATUS_STARTING': return 'Starting...';
      case 'STATUS_ENDED': return 'Ended';
      case 'STATUS_FAILED': return 'Failed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">UltraVox Call</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(callStatus)}`}></div>
          <span className="text-sm text-gray-600">{getStatusText(callStatus)}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        {!isCallActive ? (
          <button
            onClick={startCall}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Phone className="w-4 h-4" />
            )}
            {isLoading ? 'Starting...' : 'Start Call'}
          </button>
        ) : (
          <>
            <button
              onClick={endCall}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PhoneOff className="w-4 h-4" />
              )}
              {isLoading ? 'Ending...' : 'End Call'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-md transition-colors ${
                  isMicMuted 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleSpeaker}
                className={`p-2 rounded-md transition-colors ${
                  isSpeakerMuted 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {currentCall && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>Call ID:</strong> {currentCall.id}</p>
            <p><strong>Model:</strong> {currentCall.model}</p>
            <p><strong>Voice:</strong> {currentCall.voice}</p>
            {currentCall.metadata && (
              <p><strong>Flow ID:</strong> {String(currentCall.metadata.flowId || 'N/A')}</p>
            )}
          </div>

          {transcripts.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Transcripts</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {transcripts.map((transcript, index) => (
                  <p key={index} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                    {transcript}
                  </p>
                ))}
              </div>
            </div>
          )}

          {debugMessages.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Messages</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {debugMessages.map((message, index) => (
                  <p key={index} className="text-xs font-mono text-gray-500 p-2 bg-gray-50 rounded">
                    {message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Play className="w-3 h-3" />
          <span>Flow nodes: {flowData.nodes.length}</span>
          <Square className="w-3 h-3" />
          <span>Edges: {flowData.edges.length}</span>
        </div>
      </div>
    </div>
  );
} 
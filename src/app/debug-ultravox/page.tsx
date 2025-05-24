'use client';

import React, { useState } from 'react';
import { Bug, Play, AlertTriangle } from 'lucide-react';

export default function DebugUltravoxPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`[DEBUG] ${timestamp}: ${message}`);
  };

  const testCallCreation = async () => {
    if (!apiKey.trim()) {
      addLog('❌ Please enter your Ultravox API key');
      return;
    }

    setIsLoading(true);
    setLogs([]);

    try {
      addLog('🔄 Starting Ultravox call creation test...');

      // Create a simple test flow
      const testFlow = {
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            data: {
              content: 'Hello! This is a test call to verify audio functionality.',
              customPrompt: ''
            }
          }
        ],
        edges: []
      };

      const callConfig = {
        systemPrompt: 'You are a test AI assistant. Say hello and confirm audio is working.',
        model: 'fixie-ai/ultravox',
        voice: 'Mark',
        temperature: 0.7,
        firstSpeaker: 'FIRST_SPEAKER_AGENT',
        firstSpeakerSettings: {
          agent: {
            text: 'Hello! This is a test call to verify audio functionality.'
          }
        },
        medium: {
          serverWebSocket: {
            inputSampleRate: 48000,
            outputSampleRate: 48000,
          }
        },
        metadata: {
          flowId: `debug_test_${Date.now()}`,
          startNodeId: 'start-1',
          nodeType: 'start'
        }
      };

      addLog('📞 Sending call creation request...');
      console.log('Call config:', callConfig);

      const response = await fetch('/api/ultravox/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callConfig,
          apiKey: apiKey.trim()
        })
      });

      addLog(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ API Error: ${errorText}`);
        try {
          const errorJson = JSON.parse(errorText);
          addLog(`❌ Error details: ${JSON.stringify(errorJson, null, 2)}`);
        } catch {
          addLog(`❌ Raw error response: ${errorText}`);
        }
        return;
      }

      const callData = await response.json();
      addLog('✅ Call creation successful!');
      addLog(`📋 Call ID: ${callData.id || 'N/A'}`);
      addLog(`🔗 Join URL: ${callData.joinUrl || 'MISSING!'}`);
      addLog(`🎙️ Voice: ${callData.voice || 'N/A'}`);
      addLog(`🤖 Model: ${callData.model || 'N/A'}`);

      if (callData.joinUrl) {
        addLog('✅ Join URL is valid - ready for WebSocket connection');
        
        if (callData.joinUrl.startsWith('wss://')) {
          addLog('✅ Join URL format is correct (WebSocket)');
        } else {
          addLog(`❌ Join URL format is incorrect: ${callData.joinUrl}`);
        }
      } else {
        addLog('❌ CRITICAL: No joinUrl in response - this explains the audio issue!');
      }

      // Log full response for debugging
      console.log('Full Ultravox response:', callData);
      addLog('📝 Full response logged to console (F12)');

    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Debug test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bug className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ultravox Debug Tool</h1>
              <p className="text-gray-600">Test call creation to identify joinUrl issues</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Debugging the &quot;undefined joinUrl&quot; issue</p>
                <p className="mt-1">
                  This tool will test the Ultravox API call creation to see if we&apos;re getting a valid joinUrl.
                  The repeated errors suggest the joinUrl is undefined, preventing WebSocket connection.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Ultravox API Key:
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Ultravox API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your API key is only used for this test and not stored anywhere
              </p>
            </div>

            <button
              onClick={testCallCreation}
              disabled={isLoading || !apiKey.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isLoading ? 'Testing...' : 'Test Call Creation'}
            </button>

            {logs.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Debug Log:</h3>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {logs.map((log, index) => (
                    <p key={index} className="text-xs font-mono text-gray-700 p-1 bg-white rounded">
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What This Test Does</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Tests the API call creation endpoint directly</li>
              <li>• Validates the response contains a joinUrl</li>
              <li>• Checks if the joinUrl format is correct (wss://)</li>
              <li>• Logs detailed information for debugging</li>
              <li>• Helps identify where the &quot;undefined&quot; joinUrl comes from</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Expected Results:</h4>
            <p className="text-sm text-blue-800">
              If successful, you should see a valid joinUrl starting with &quot;wss://&quot;. 
              If the joinUrl is missing or undefined, that explains why the audio isn&apos;t working.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
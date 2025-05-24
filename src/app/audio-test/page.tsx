'use client';

import React, { useState } from 'react';
import { Volume2, Play, AlertCircle } from 'lucide-react';

export default function AudioTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBrowserAudio = async () => {
    setIsTestingAudio(true);
    setTestResults([]);
    
    try {
      addResult('🔧 Starting browser audio compatibility test...');
      
      // Test 1: AudioContext
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          addResult(`✅ AudioContext available (state: ${ctx.state})`);
          
          if (ctx.state === 'suspended') {
            await ctx.resume();
            addResult('✅ AudioContext resumed successfully');
          }
          
          // Test with oscillator
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          
          addResult('✅ Test tone played successfully');
          ctx.close();
        } else {
          addResult('❌ AudioContext not available');
        }
      } catch (error) {
        addResult(`❌ AudioContext test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Test 2: HTML5 Audio
      try {
        const audio = new Audio();
        audio.volume = 0.1;
        const audioPromise = audio.play();
        if (audioPromise) {
          await audioPromise;
          audio.pause();
          addResult('✅ HTML5 Audio test passed');
        }
      } catch (error) {
        addResult(`❌ HTML5 Audio test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Test 3: Media Devices
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          addResult('✅ getUserMedia available');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          addResult('✅ Microphone access granted');
        } else {
          addResult('❌ getUserMedia not available');
        }
      } catch (error) {
        addResult(`❌ Microphone test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Test 4: Audio Output Devices
      if ('setSinkId' in HTMLAudioElement.prototype) {
        addResult('✅ Audio output device selection supported');
      } else {
        addResult('⚠️ Audio output device selection not supported');
      }
      
      addResult('🎉 Browser audio test completed!');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTestingAudio(false);
    }
  };

  const playTestSound = async () => {
    try {
      addResult('🔊 Playing test sound...');
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1);
      
      addResult('✅ Test sound played (you should hear a tone)');
      
      setTimeout(() => ctx.close(), 1100);
    } catch (error) {
      addResult(`❌ Test sound failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ultravox Audio Test</h1>
              <p className="text-gray-600">Test your browser&apos;s audio capabilities for Ultravox calls</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">If Ultravox agent voice isn&apos;t working:</p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Run the audio compatibility test below</li>
                  <li>Try the test sound to verify your speakers work</li>
                  <li>Make sure your system volume is up</li>
                  <li>Check that your browser allows audio playback</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={testBrowserAudio}
                disabled={isTestingAudio}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
              >
                {isTestingAudio ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isTestingAudio ? 'Testing...' : 'Test Audio Compatibility'}
              </button>

              <button
                onClick={playTestSound}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                Play Test Sound
              </button>
            </div>

            {testResults.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Test Results:</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <p key={index} className="text-xs font-mono text-gray-700 p-1 bg-white rounded">
                      {result}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Browser Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User Agent:</strong>
                <p className="text-gray-600 break-all">{navigator.userAgent}</p>
              </div>
              <div>
                <strong>Audio Support:</strong>
                <ul className="text-gray-600 space-y-1">
                  <li>AudioContext: {!!(window.AudioContext || (window as any).webkitAudioContext) ? '✅' : '❌'}</li>
                  <li>getUserMedia: {!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? '✅' : '❌'}</li>
                  <li>Audio Output Selection: {'setSinkId' in HTMLAudioElement.prototype ? '✅' : '❌'}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps:</h4>
            <p className="text-sm text-blue-800">
              After running these tests, go back to your Ultravox flow and try starting a call again. 
              Use the "Force Enable Audio" button in the troubleshooting section if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import { X, Globe, Settings, Mic, Volume2 } from 'lucide-react';
import { useFlowContext } from '../lib/flow-context';
import { UltravoxSettings } from '../types';

interface GlobalSettingsPanelProps {
  onClose: () => void;
}

const AVAILABLE_VOICES = [
  'Jessica',
  'Mark', 
  'Carter',
  'Cassidy-English',
  'David-English-British',
  'Alex-Spanish',
  'Amrut-English-Indian',
  'Chinmay-English-Indian',
  'Riya-Rao-English-Indian',
  'Anika-English-Indian',
  'Muyiwa-English',
  'Elilhiz-English',
  'Monika-English-Indian',
  'Raju-English-Indian',
  'Francisco-Portuguese',
  'Haytham-Arabic-Egyptian',
  'Amr-Arabic-Egyptian',
  'Flavia-Spanish',
  'Carolina-Spanish',
  'Miquel-Spanish',
  'Victor-Spanish',
  'Keren-Brazilian-Portuguese',
  'Tanya-English',
  'Emily-English',
  'Aaron-English',
  'Conversationalist-English',
  'Hugo-French',
  'Andrea-Spanish',
  'Damian-Spanish',
  'Muskaan-Hindi-Urdu',
  'Anjali-Hindi-Urdu',
  'Krishna-Hindi-Urdu',
  'Ben-German',
  'Frida - German',
  'Marcin-Polish',
  'Hanna-Polish',
  'Emma-Norwegian',
  'Johannes-Norwegian',
  'Steve-English-Australian',
  'Coco-French',
  'Gabriel-French',
  'Daniel-Dutch',
  'Chelsea',
  'Vira-Ukrainian',
  'Dmytro-Ukrainian',
  'Cicek-Turkish',
  'Doga-Turkish',
  'Tatiana-Spanish',
  'Mauricio-Spanish',
  'Felix-Russian',
  'Rosa-Portuguese',
  'Samuel-Portuguese',
  'Morioki-Japanese',
  'Asahi-Japanese',
  'Nadia-Russian',
  'Linda-Italian',
  'Giovanni-Italian',
  'Riya-Hindi-Urdu',
  'Aakash-Hindi',
  'Susi-German',
  'Alize-French',
  'Nicolas-French',
  'Ruth-Dutch',
  'Sana-Arabic',
  'Sanna-Swedish',
  'Adam-Swedish',
  'Anas-Arabic',
  'Martin-Chinese',
  'Oliver',
  'Maya-Chinese'
];

const AVAILABLE_MODELS = [
  'fixie-ai/ultravox'
];

const FIRST_SPEAKER_OPTIONS = [
  { value: 'FIRST_SPEAKER_AGENT', label: 'Agent speaks first' },
  { value: 'FIRST_SPEAKER_USER', label: 'User speaks first' },
  { value: 'FIRST_SPEAKER_UNSPECIFIED', label: 'Unspecified' }
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' }
];

const DEFAULT_SETTINGS: UltravoxSettings = {
  voice: 'Mark',
  model: 'fixie-ai/ultravox',
  temperature: 0.4,
  languageHint: 'en',
  recordingEnabled: true,
  maxDuration: '1800s',
  firstSpeaker: 'FIRST_SPEAKER_AGENT'
};

const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({ onClose }) => {
  const { state, setUltravoxSettings } = useFlowContext();
  const { flowData } = state;

  const [localSettings, setLocalSettings] = useState<UltravoxSettings>(() => ({
    voice: flowData.ultravoxSettings?.voice || 'Mark',
    model: flowData.ultravoxSettings?.model || 'fixie-ai/ultravox',
    temperature: flowData.ultravoxSettings?.temperature || 0.4,
    languageHint: flowData.ultravoxSettings?.languageHint || 'en',
    recordingEnabled: flowData.ultravoxSettings?.recordingEnabled || true,
    maxDuration: flowData.ultravoxSettings?.maxDuration || '1800s',
    firstSpeaker: flowData.ultravoxSettings?.firstSpeaker || 'FIRST_SPEAKER_AGENT'
  }));

  const handleSettingChange = (key: keyof UltravoxSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setUltravoxSettings(newSettings);
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    handleSettingChange('temperature', value);
  };

  const resetToDefaults = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    setUltravoxSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="w-full sm:w-80 md:w-96 lg:w-[400px] min-w-[280px] max-w-[500px] bg-white border-l border-gray-200 shadow-lg h-full overflow-hidden transform transition-transform duration-300 ease-in-out md:transform-none animate-slide-in-right">
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Global Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Voice Configuration */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-blue-600" />
              <h4 className="text-md font-medium text-gray-900">Voice Configuration</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Voice Selection
                </label>
                <select
                  value={localSettings.voice}
                  onChange={(e) => handleSettingChange('voice', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  {AVAILABLE_VOICES.map(voice => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Language Hint
                </label>
                <select
                  value={localSettings.languageHint}
                  onChange={(e) => handleSettingChange('languageHint', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  {LANGUAGE_OPTIONS.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Model Configuration */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-green-600" />
              <h4 className="text-md font-medium text-gray-900">Model Configuration</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  AI Model
                </label>
                <select
                  value={localSettings.model}
                  onChange={(e) => handleSettingChange('model', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  {AVAILABLE_MODELS.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Temperature: {localSettings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.temperature}
                  onChange={handleTemperatureChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-700 mt-1">
                  <span>Focused (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call Configuration */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-purple-600" />
              <h4 className="text-md font-medium text-gray-900">Call Configuration</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  First Speaker
                </label>
                <select
                  value={localSettings.firstSpeaker}
                  onChange={(e) => handleSettingChange('firstSpeaker', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  {FIRST_SPEAKER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Max Duration (seconds)
                </label>
                <select
                  value={localSettings.maxDuration}
                  onChange={(e) => handleSettingChange('maxDuration', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  <option value="300s">5 minutes</option>
                  <option value="600s">10 minutes</option>
                  <option value="900s">15 minutes</option>
                  <option value="1800s">30 minutes</option>
                  <option value="3600s">1 hour</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-800">
                  Recording Enabled
                </label>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    localSettings.recordingEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  onClick={() => handleSettingChange('recordingEnabled', !localSettings.recordingEnabled)}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      localSettings.recordingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={resetToDefaults}
              className="w-full px-4 py-2 text-sm font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Information */}
          <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg">
            <p className="mb-2"><strong>💡 About these settings:</strong></p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• <strong>Voice:</strong> Controls the AI agent's voice characteristics</li>
              <li>• <strong>Model:</strong> Determines the AI's conversation capabilities</li>
              <li>• <strong>Temperature:</strong> Controls creativity vs. focus in responses</li>
              <li>• <strong>Language:</strong> Helps optimize speech recognition and synthesis</li>
              <li>• <strong>Recording:</strong> Enables call recording for quality and training</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsPanel; 
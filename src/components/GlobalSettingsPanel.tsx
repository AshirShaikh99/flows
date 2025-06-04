import React, { useState, useEffect } from 'react';
import { X, Globe } from 'lucide-react';
import { useFlowContext } from '../lib/flow-context';

interface GlobalSettingsPanelProps {
  onClose: () => void;
}

const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({ onClose }) => {
  const { state, setGlobalPrompt } = useFlowContext();
  const [globalPrompt, setLocalGlobalPrompt] = useState(state.flowData.globalPrompt || '');

  useEffect(() => {
    setLocalGlobalPrompt(state.flowData.globalPrompt || '');
  }, [state.flowData.globalPrompt]);

  const handleSave = () => {
    setGlobalPrompt(globalPrompt);
  };

  const handleGlobalPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalGlobalPrompt(e.target.value);
  };

  const handleBlur = () => {
    handleSave();
  };

  return (
    <div className="w-full sm:w-80 md:w-96 lg:w-[400px] min-w-[280px] max-w-[500px] bg-white border-l border-gray-200 shadow-lg h-full overflow-hidden transform transition-transform duration-300 ease-in-out md:transform-none animate-slide-in-right">
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Global Flow Settings
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Global Prompt
            </label>
            <textarea
              value={globalPrompt}
              onChange={handleGlobalPromptChange}
              onBlur={handleBlur}
              placeholder="Enter a global prompt that will apply to the entire flow... This prompt will be prepended to all node-specific prompts and helps establish the overall context and behavior of your AI assistant."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm text-gray-900 min-h-[120px]"
              rows={6}
            />
            <div className="text-xs text-gray-500 mt-1">
              {globalPrompt.length} characters
            </div>
            <div className="text-xs text-gray-600 mt-2 bg-blue-50 p-3 rounded-lg">
              <strong>💡 Tip:</strong> The global prompt helps establish the overall personality, context, and behavior of your AI assistant. It will be applied consistently across all nodes in your flow.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-md font-medium text-gray-800">Global Settings</h4>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p className="mb-2"><strong>Current Flow Overview:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Nodes: {state.flowData.nodes.length}</li>
                <li>• Edges: {state.flowData.edges.length}</li>
                <li>• Global Prompt: {globalPrompt ? 'Configured' : 'Not set'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsPanel; 
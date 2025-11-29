import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Bot, Globe } from 'lucide-react';
import { AppModel, AiProvider } from '../types';

interface ApiKeyModalProps {
  onComplete: (key: string, model: string, provider: AiProvider) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onComplete }) => {
  const [key, setKey] = useState('');
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [model, setModel] = useState<string>(AppModel.GEMINI_FLASH);
  const [customModel, setCustomModel] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);

  // Auto-fill from env if available (dev convenience)
  useEffect(() => {
    if (process.env.API_KEY) {
      setKey(process.env.API_KEY);
    }
  }, []);

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    setIsCustomModel(false);
    if (newProvider === 'gemini') {
      setModel(AppModel.GEMINI_FLASH);
    } else {
      setModel(AppModel.GPT_4O);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalModel = isCustomModel ? customModel : model;
    if (key.trim().length > 0 && finalModel.trim().length > 0) {
      onComplete(key, finalModel, provider);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100">
        <div className="flex items-center gap-3 mb-6 text-indigo-600">
          <Key className="w-8 h-8" />
          <h2 className="text-2xl font-bold text-slate-800">API Setup</h2>
        </div>
        
        <p className="text-slate-600 mb-6 leading-relaxed">
          Select your AI provider and enter your API key to start architecting.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Provider</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${provider === 'gemini' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Bot size={16} /> Google Gemini
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${provider === 'openai' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Globe size={16} /> OpenAI
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
            </label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Model</label>
            <div className="space-y-2">
              <select 
                value={isCustomModel ? 'custom' : model} 
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomModel(true);
                  } else {
                    setIsCustomModel(false);
                    setModel(e.target.value);
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                {provider === 'gemini' ? (
                  <>
                    <option value={AppModel.GEMINI_FLASH}>Gemini 2.5 Flash (Fastest)</option>
                    <option value={AppModel.GEMINI_3_PRO}>Gemini 3.0 Pro (Best Quality)</option>
                  </>
                ) : (
                  <>
                    <option value={AppModel.GPT_4O}>GPT-4o (Best)</option>
                    <option value={AppModel.GPT_35_TURBO}>GPT-3.5 Turbo (Fast)</option>
                  </>
                )}
                <option value="custom">Custom (Enter Name)...</option>
              </select>

              {isCustomModel && (
                <input 
                  type="text" 
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="e.g. gpt-4-turbo-preview or gemini-1.5-pro"
                  className="w-full px-4 py-2 text-sm rounded-lg border border-indigo-200 bg-indigo-50 focus:border-indigo-500 outline-none"
                  required
                />
              )}
            </div>
          </div>

          <button 
            type="submit"
            disabled={!key || (isCustomModel && !customModel)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {key ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            Start Architecting
          </button>
        </form>
      </div>
    </div>
  );
};
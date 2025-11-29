import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle } from 'lucide-react';
import { AppModel } from '../types';

interface ApiKeyModalProps {
  onComplete: (key: string, model: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onComplete }) => {
  const [key, setKey] = useState('');
  const [model, setModel] = useState(AppModel.GEMINI_FLASH);

  // Auto-fill from env if available (dev convenience)
  useEffect(() => {
    // Note: In a real production build this might not be exposed, 
    // but useful for the developer testing this code.
    if (process.env.API_KEY) {
      setKey(process.env.API_KEY);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length > 0) {
      onComplete(key, model);
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
          To generate your app architecture, please provide your Gemini API key. 
          Your key is used locally and never stored on our servers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
            <p className="text-xs text-slate-400 mt-2">
              Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Get one here</a>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Model</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value as AppModel)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value={AppModel.GEMINI_FLASH}>Gemini 2.5 Flash (Fastest)</option>
              <option value={AppModel.GEMINI_3_PRO}>Gemini 3.0 Pro (Best Quality)</option>
              {/* OpenAI options shown for UI requirement, though logic defaults to Gemini implementation */}
              <option disabled>OpenAI GPT-4o (Coming Soon)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={!key}
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

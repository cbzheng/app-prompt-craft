import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "AI is thinking..." }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
          <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 flex items-center justify-center">
             <BrainCircuit className="w-16 h-16 text-indigo-600 animate-pulse" />
          </div>
          <div className="absolute -top-3 -right-3 bg-indigo-600 text-white p-2 rounded-full animate-bounce shadow-lg">
            <Sparkles size={20} fill="currentColor" />
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Generating</h3>
          <p className="text-slate-500 font-medium animate-pulse">{message}</p>
        </div>
      </div>
    </div>
  );
};
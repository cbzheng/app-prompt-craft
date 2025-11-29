import React, { useState } from 'react';
import { Check, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { AppFeature } from '../types';

interface FeatureCardProps {
  feature: AppFeature;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newTitle: string, newDesc: string) => void;
  custom?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onToggle, onDelete, onEdit, custom }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(feature.title);
  const [editDesc, setEditDesc] = useState(feature.description);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(feature.id, editTitle, editDesc);
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(feature.title);
    setEditDesc(feature.description);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative p-4 rounded-xl border-2 border-indigo-400 bg-white shadow-lg z-10">
        <div className="mb-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full font-bold text-slate-800 border-b border-indigo-200 focus:border-indigo-500 outline-none pb-1 mb-2"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="w-full text-sm text-slate-600 leading-relaxed border border-slate-200 rounded p-2 focus:border-indigo-500 outline-none resize-none h-24"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
          <button
            onClick={handleSave}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
            title="Save"
          >
            <Save size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onToggle(feature.id)}
      className={`
        relative group cursor-pointer p-5 rounded-xl border-2 transition-all duration-200
        ${feature.selected 
          ? 'border-indigo-500 bg-indigo-50/50 shadow-md' 
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-bold ${feature.selected ? 'text-indigo-900' : 'text-slate-800'}`}>
          {feature.title}
        </h3>
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ml-2
          ${feature.selected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-300'}
        `}>
          <Check size={14} strokeWidth={3} />
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pr-6">
        {feature.description}
      </p>

      {/* Action Buttons */}
      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {onEdit && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
            title="Edit Feature"
          >
            <Edit2 size={16} />
          </button>
        )}
        {custom && onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(feature.id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Delete Feature"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
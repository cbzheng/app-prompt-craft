import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Layout, Database, Terminal, MousePointer2 } from 'lucide-react';
import { WorkflowNodeData, NodeType } from '../types';

const NodeIcon = ({ type }: { type: NodeType }) => {
  switch (type) {
    case 'view': return <Layout className="w-4 h-4" />;
    case 'database': return <Database className="w-4 h-4" />;
    case 'logic': return <Terminal className="w-4 h-4" />;
    case 'userAction': return <MousePointer2 className="w-4 h-4" />;
    default: return <Layout className="w-4 h-4" />;
  }
};

const NodeColor = (type: NodeType) => {
  switch (type) {
    case 'view': return 'border-blue-400 bg-blue-50 text-blue-900';
    case 'database': return 'border-emerald-400 bg-emerald-50 text-emerald-900';
    case 'logic': return 'border-amber-400 bg-amber-50 text-amber-900';
    case 'userAction': return 'border-purple-400 bg-purple-50 text-purple-900';
    default: return 'border-slate-400 bg-slate-50';
  }
};

export const WorkflowNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div className={`
      relative min-w-[200px] max-w-[280px] rounded-lg border-2 shadow-sm transition-all
      ${NodeColor(data.type)}
      ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
      ${data.isNew ? 'animate-pulse ring-2 ring-green-400 ring-offset-1' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3" />
      
      <div className="px-4 py-3 border-b border-black/5 flex items-center gap-2">
        <NodeIcon type={data.type} />
        <span className="font-bold text-sm uppercase tracking-wider opacity-80">{data.type}</span>
      </div>
      
      <div className="p-4 bg-white/50 rounded-b-lg">
        <h3 className="font-bold text-lg mb-1">{data.label}</h3>
        <p className="text-xs opacity-75 leading-snug">{data.details}</p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3" />
    </div>
  );
});

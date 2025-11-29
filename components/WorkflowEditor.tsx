import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  Node,
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  Panel,
  MarkerType
} from 'reactflow';
import { WorkflowNode } from './CustomNodes';
import { Wand2, Plus, Loader2, Save, Maximize2, Minimize2, Trash2, Edit2, ZoomIn } from 'lucide-react';
import { WorkflowNodeData, NodeType, GenerationConfig } from '../types';
import { AiService } from '../services/geminiService';
import { LoadingOverlay } from './LoadingOverlay';

const nodeTypes = {
  view: WorkflowNode,
  logic: WorkflowNode,
  database: WorkflowNode,
  userAction: WorkflowNode,
};

interface WorkflowEditorProps {
  initialNodes: any[];
  initialEdges: any[];
  geminiService: AiService;
  onSave: (nodes: Node[], edges: Edge[], summaryLength: GenerationConfig['summaryLength']) => void;
  onGraphUpdate: (nodes: Node[], edges: Edge[]) => void;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ 
  initialNodes, 
  initialEdges, 
  geminiService,
  onSave,
  onGraphUpdate
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [summaryLength, setSummaryLength] = useState<GenerationConfig['summaryLength']>('short');
  
  // Selection & Editing State
  const [selectedElement, setSelectedElement] = useState<{id: string, type: 'node' | 'edge'} | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);

  // Sync internal state to parent on change
  useEffect(() => {
    onGraphUpdate(nodes, edges);
  }, [nodes, edges, onGraphUpdate]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
    ...params,
    markerEnd: { type: MarkerType.ArrowClosed }
  }, eds)), [setEdges]);

  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[], edges: Edge[] }) => {
    if (nodes.length > 0) {
      setSelectedElement({ id: nodes[0].id, type: 'node' });
    } else if (edges.length > 0) {
      setSelectedElement({ id: edges[0].id, type: 'edge' });
    } else {
      setSelectedElement(null);
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedElement) return;
    if (selectedElement.type === 'node') {
      setNodes((nds) => nds.filter((n) => n.id !== selectedElement.id));
      setSelectedElement(null);
    } else {
      setEdges((eds) => eds.filter((e) => e.id !== selectedElement.id));
      setSelectedElement(null);
    }
  }, [selectedElement, setNodes, setEdges]);

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setEditingNode(node);
  };

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    setEditingEdge(edge);
    setSelectedElement({ id: edge.id, type: 'edge' });
  };

  const saveNodeEdit = (label: string, details: string) => {
    if (!editingNode) return;
    setNodes((nds) => nds.map((n) => {
      if (n.id === editingNode.id) {
        return { ...n, data: { ...n.data, label, details } };
      }
      return n;
    }));
    setEditingNode(null);
  };

  const saveEdgeEdit = (label: string) => {
    if (!editingEdge) return;
    setEdges((eds) => eds.map((e) => {
      if (e.id === editingEdge.id) {
        return { ...e, label };
      }
      return e;
    }));
    setEditingEdge(null);
  };

  const addManualNode = (type: NodeType) => {
    const id = `manual-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: Math.random() * 400 + 50, y: Math.random() * 400 + 50 },
      data: { 
        label: 'New Node', 
        details: 'Double click to edit', 
        type 
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleAIAssist = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    try {
      const result = await geminiService.extendWorkflow(nodes, edges, prompt);
      
      const newNodes = result.nodes.map((n: any) => ({
        ...n,
        position: { x: n.x, y: n.y },
        data: { ...n, type: n.type || 'logic', isNew: true },
      }));

      const newEdges = result.edges.map((e: any) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed }
      }));

      setNodes((prev) => [...prev, ...newNodes]);
      setEdges((prev) => [...prev, ...newEdges]);
      setPrompt('');
      
      setTimeout(() => {
        setNodes((nds) => nds.map(n => ({
          ...n,
          data: { ...n.data, isNew: false }
        })));
      }, 3000);

    } catch (error) {
      console.error("Failed to extend workflow", error);
      alert("AI failed to generate changes. Try a simpler request.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`
      border border-slate-200 bg-slate-50 relative overflow-hidden shadow-inner transition-all duration-300
      ${isFullScreen 
        ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' 
        : 'w-full h-[600px] rounded-xl'
      }
    `}>
      {isProcessing && <LoadingOverlay message="Updating Workflow..." />}

      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onSelectionChange={onSelectionChange}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeClick={handleEdgeClick}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls />
          
          {/* Top Left Controls */}
          <Panel position="top-left" className="flex flex-col gap-2">
            <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tools</div>
              <div className="flex flex-col gap-2">
                 <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => addManualNode('view')} className="p-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200">View</button>
                   <button onClick={() => addManualNode('logic')} className="p-2 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200">Logic</button>
                   <button onClick={() => addManualNode('database')} className="p-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200">Data</button>
                   <button onClick={() => addManualNode('userAction')} className="p-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200">Action</button>
                 </div>
                 {selectedElement && (
                   <button 
                     onClick={deleteSelected}
                     className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 border border-red-200"
                   >
                     <Trash2 size={12} /> Delete Selected
                   </button>
                 )}
              </div>
            </div>
          </Panel>

          {/* AI Assistant */}
          <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-xl border border-slate-200 w-80">
             <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                  <Wand2 size={16} />
                  <span>AI Assistant</span>
               </div>
               <button 
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-slate-400 hover:text-slate-600 p-1"
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
               >
                 {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
               </button>
             </div>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Add a user authentication step before the dashboard'"
                className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none mb-2 h-20 resize-none"
             />
             <button 
                onClick={handleAIAssist}
                disabled={isProcessing || !prompt}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2 px-4 rounded text-sm font-medium flex items-center justify-center gap-2"
             >
                {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                Add to Workflow
             </button>
          </Panel>
          
          {/* Bottom Save Bar */}
          <Panel position="bottom-center" className="bg-white p-2 rounded-full shadow-xl border border-slate-200 mb-4 flex items-center gap-3">
             <div className="flex items-center gap-2 px-2 border-r border-slate-200">
               <span className="text-xs font-semibold text-slate-500">Summary:</span>
               <select 
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value as any)}
                className="text-sm bg-transparent outline-none font-medium text-slate-700"
               >
                 <option value="short">Short</option>
                 <option value="detailed">Detailed</option>
               </select>
             </div>
             <button 
                onClick={() => onSave(nodes, edges, summaryLength)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
             >
                <Save size={16} />
                Save & Generate
             </button>
          </Panel>
        </ReactFlow>

        {/* Edit Node Modal */}
        {editingNode && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingNode(null)}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Edit Component</h3>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label</label>
                <input 
                  type="text" 
                  defaultValue={editingNode.data.label}
                  id="edit-node-label"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Details</label>
                <textarea 
                  defaultValue={editingNode.data.details}
                  id="edit-node-details"
                  className="w-full border border-slate-300 rounded p-2 h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingNode(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button 
                  onClick={() => {
                    const label = (document.getElementById('edit-node-label') as HTMLInputElement).value;
                    const details = (document.getElementById('edit-node-details') as HTMLTextAreaElement).value;
                    saveNodeEdit(label, details);
                  }} 
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Edge Modal */}
        {editingEdge && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingEdge(null)}>
             <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Edit Connection</h3>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label</label>
                <input 
                  type="text" 
                  defaultValue={editingEdge.label as string}
                  id="edit-edge-label"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingEdge(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button 
                  onClick={() => {
                    const label = (document.getElementById('edit-edge-label') as HTMLInputElement).value;
                    saveEdgeEdit(label);
                  }} 
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      </ReactFlowProvider>
    </div>
  );
};
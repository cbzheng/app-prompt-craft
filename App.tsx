import React, { useState, useMemo } from 'react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FeatureCard } from './components/FeatureCard';
import { WorkflowEditor } from './components/WorkflowEditor';
import { GeminiService } from './services/geminiService';
import { AppState, AppFeature, GenerationConfig, AppModel } from './types';
import { Sparkles, ArrowRight, Lightbulb, Box, FileText, RotateCcw, ChevronRight, Target, Layers } from 'lucide-react';
import { LoadingOverlay } from './components/LoadingOverlay';

const App: React.FC = () => {
  // Application State
  const [state, setState] = useState<AppState>({
    step: 'setup',
    apiKey: '',
    model: '',
    idea: '',
    features: [],
    graph: { nodes: [], edges: [], isGenerated: false, version: 0 },
    config: {
      featureStyle: 'standard',
      workflowComplexity: 'simple',
      workflowType: 'full-stack',
      summaryLength: 'short',
      productScope: 'mvp',
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI is thinking...');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [customFeatureInput, setCustomFeatureInput] = useState('');

  // Memoize Service to avoid recreation
  const geminiService = useMemo(() => {
    if (!state.apiKey) return null;
    return new GeminiService(state.apiKey, state.model);
  }, [state.apiKey, state.model]);

  // --- Helpers ---

  const updateConfig = (key: keyof GenerationConfig, value: any) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  const goToStep = (step: AppState['step']) => {
    setState(prev => ({ ...prev, step }));
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setState(prev => ({ ...prev, model: newModel }));
  };

  // --- Handlers ---

  const handleApiSetup = (key: string, model: string) => {
    setState(prev => ({ ...prev, apiKey: key, model: model, step: 'ideation' }));
  };

  const generateFeatures = async () => {
    if (!geminiService || !state.idea.trim()) return;
    setIsLoading(true);
    setLoadingMessage('Brainstorming features...');
    try {
      const features = await geminiService.generateFeatures(
        state.idea, 
        state.config.featureStyle,
        state.config.productScope
      );
      const featuresWithIds: AppFeature[] = features.map((f, i) => ({
        ...f,
        id: `f-${i}`,
        selected: true
      }));
      setState(prev => ({ ...prev, features: featuresWithIds, step: 'features' }));
    } catch (e) {
      alert("Failed to generate features. Please check your API key.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (id: string) => {
    setState(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === id ? { ...f, selected: !f.selected } : f)
    }));
  };

  const updateFeature = (id: string, newTitle: string, newDesc: string) => {
    setState(prev => ({
      ...prev,
      features: prev.features.map(f => 
        f.id === id ? { ...f, title: newTitle, description: newDesc } : f
      )
    }));
  };

  const deleteFeature = (id: string) => {
    setState(prev => ({
      ...prev,
      features: prev.features.filter(f => f.id !== id)
    }));
  };

  const addCustomFeature = () => {
    if (!customFeatureInput.trim()) return;
    const newFeature: AppFeature = {
      id: `custom-${Date.now()}`,
      title: customFeatureInput,
      description: 'User defined feature',
      selected: true
    };
    setState(prev => ({ ...prev, features: [...prev.features, newFeature] }));
    setCustomFeatureInput('');
  };

  const generateInitialDiagram = async () => {
    if (!geminiService) return;
    const selectedFeatures = state.features.filter(f => f.selected);
    if (selectedFeatures.length === 0) {
      alert("Please select at least one feature.");
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Architecting workflow diagram...');
    try {
      const graph = await geminiService.generateWorkflow(
        state.idea, 
        selectedFeatures,
        state.config.workflowComplexity,
        state.config.workflowType
      );
      
      const flowNodes = graph.nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        position: { x: n.x, y: n.y },
        data: { label: n.label, details: n.details, type: n.type }
      }));
      
      const flowEdges = graph.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
      }));

      setState(prev => ({ 
        ...prev, 
        graph: { 
          nodes: flowNodes, 
          edges: flowEdges, 
          isGenerated: true,
          version: prev.graph.version + 1
        },
        step: 'workflow'
      }));

    } catch (e) {
        console.error(e);
        alert(`Failed to generate diagram.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGraphUpdate = (nodes: any[], edges: any[]) => {
    setState(prev => ({
      ...prev,
      graph: { ...prev.graph, nodes, edges }
    }));
  };

  const handleFinalize = async (nodes: any[], edges: any[], summaryLength: GenerationConfig['summaryLength']) => {
    if (!geminiService) return;
    setIsLoading(true);
    setLoadingMessage('Writing technical documentation...');
    
    // Update config locally for reference if needed
    updateConfig('summaryLength', summaryLength);
    
    try {
      const desc = await geminiService.generateDescription(state.idea, nodes, edges, summaryLength);
      setGeneratedDescription(desc);
      setState(prev => ({ ...prev, step: 'summary' }));
    } catch (e) {
        console.error(e);
        setGeneratedDescription("Failed to generate description.");
        setState(prev => ({ ...prev, step: 'summary' }));
    } finally {
      setIsLoading(false);
    }
  };

  const restart = () => {
      setState(prev => ({ 
        ...prev, 
        step: 'ideation', 
        features: [], 
        graph: { nodes: [], edges: [], isGenerated: false, version: 0 },
        idea: '' 
      }));
      setGeneratedDescription('');
  };

  // --- Render Components ---

  const NavStep = ({ label, targetStep, currentStep }: { label: string, targetStep: AppState['step'], currentStep: AppState['step'] }) => {
    const steps = ['setup', 'ideation', 'features', 'workflow', 'summary'];
    const targetIdx = steps.indexOf(targetStep);
    const currentIdx = steps.indexOf(currentStep);
    const isPast = targetIdx < currentIdx;
    const isCurrent = targetIdx === currentIdx;

    return (
      <button 
        onClick={() => isPast && goToStep(targetStep)}
        disabled={!isPast && !isCurrent}
        className={`flex items-center text-sm font-medium transition-colors 
          ${isCurrent ? 'text-indigo-600' : isPast ? 'text-slate-600 hover:text-indigo-600 hover:underline' : 'text-slate-300'}
        `}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      
      {state.step === 'setup' && <ApiKeyModal onComplete={handleApiSetup} />}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <Box size={20} />
              </div>
              <h1 className="font-bold text-xl tracking-tight hidden sm:block">AppArchitect <span className="text-indigo-600">AI</span></h1>
            </div>

            {/* Navigation / Breadcrumbs */}
            {state.step !== 'setup' && (
              <div className="hidden md:flex items-center gap-2">
                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                <NavStep label="Idea" targetStep="ideation" currentStep={state.step} />
                <ChevronRight size={14} className="text-slate-300" />
                <NavStep label="Features" targetStep="features" currentStep={state.step} />
                <ChevronRight size={14} className="text-slate-300" />
                <NavStep label="Workflow" targetStep="workflow" currentStep={state.step} />
                <ChevronRight size={14} className="text-slate-300" />
                <NavStep label="Summary" targetStep="summary" currentStep={state.step} />
              </div>
            )}
          </div>
          
          {state.step !== 'setup' && (
             <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                   <span className="hidden sm:inline">Model:</span>
                   <select 
                      value={state.model} 
                      onChange={handleModelChange}
                      className="bg-slate-100 border-none rounded text-xs font-mono text-indigo-700 py-1 px-2 cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                      <option value={AppModel.GEMINI_FLASH}>Gemini Flash</option>
                      <option value={AppModel.GEMINI_3_PRO}>Gemini 3.0 Pro</option>
                   </select>
                </div>
                <button onClick={restart} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                    <RotateCcw size={14} /> <span className="hidden sm:inline">Restart</span>
                </button>
             </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        
        {/* Ideation Step */}
        {state.step === 'ideation' && (
          <div className="max-w-2xl mx-auto mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lightbulb size={24} />
              </div>
              <h2 className="text-3xl font-bold mb-4">What do you want to build?</h2>
              <p className="text-slate-500 mb-8">Describe your app idea in a sentence or two.</p>
              
              <div className="mb-6 flex flex-wrap justify-center gap-4">
                 {/* Feature Style Toggle */}
                 <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Creativity</span>
                    <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button 
                          onClick={() => updateConfig('featureStyle', 'standard')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${state.config.featureStyle === 'standard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Standard
                        </button>
                        <button 
                          onClick={() => updateConfig('featureStyle', 'creative')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${state.config.featureStyle === 'creative' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Wild
                        </button>
                    </div>
                 </div>
                 
                 {/* Product Scope Toggle */}
                 <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scope</span>
                    <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button 
                          onClick={() => updateConfig('productScope', 'mvp')}
                          title="Minimum Viable Product (Prototype)"
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${state.config.productScope === 'mvp' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Target size={14} /> MVP
                        </button>
                        <button 
                          onClick={() => updateConfig('productScope', 'complete')}
                          title="Complete Production Product"
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${state.config.productScope === 'complete' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <Layers size={14} /> Full
                        </button>
                    </div>
                 </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={state.idea}
                  onChange={(e) => setState(prev => ({ ...prev, idea: e.target.value }))}
                  placeholder="e.g., A fitness tracker for dogs with social features..."
                  className="w-full p-4 pr-14 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && generateFeatures()}
                />
                <button 
                  onClick={generateFeatures}
                  disabled={isLoading || !state.idea}
                  className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 rounded-lg transition-colors flex items-center"
                >
                  <ArrowRight />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features Step */}
        {state.step === 'features' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Core Features</h2>
                <p className="text-slate-500">
                  Select and refine the features. <span className="hidden sm:inline">Click edit icon to modify text.</span>
                </p>
              </div>
              
              {/* Generation Controls */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Components</label>
                  <select 
                    value={state.config.workflowType}
                    onChange={(e) => updateConfig('workflowType', e.target.value)}
                    className="text-sm bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                  >
                    <option value="full-stack">Full Stack (View + API + DB)</option>
                    <option value="frontend-only">Frontend Only</option>
                    <option value="backend-focus">Backend Focus</option>
                  </select>
                </div>
                
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                
                 <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Complexity</label>
                  <select 
                    value={state.config.workflowComplexity}
                    onChange={(e) => updateConfig('workflowComplexity', e.target.value)}
                    className="text-sm bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                  >
                    <option value="simple">Simple Flow</option>
                    <option value="complex">Complex Flow</option>
                  </select>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                <button 
                  onClick={() => generateInitialDiagram()}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                >
                  <Sparkles size={18} />
                  Generate Workflow
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {state.features.map(feature => (
                <FeatureCard 
                  key={feature.id} 
                  feature={feature} 
                  onToggle={toggleFeature}
                  onEdit={updateFeature}
                  onDelete={feature.id.startsWith('custom') ? deleteFeature : undefined}
                  custom={feature.id.startsWith('custom')}
                />
              ))}
              
              {/* Custom Feature Card */}
              <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col justify-center gap-3">
                <h3 className="font-bold text-slate-500">Add Custom Feature</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customFeatureInput}
                    onChange={(e) => setCustomFeatureInput(e.target.value)}
                    placeholder="Feature name..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:border-indigo-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomFeature()}
                  />
                  <button 
                    onClick={addCustomFeature}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded transition-colors"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Step */}
        {state.step === 'workflow' && geminiService && (
          <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <div className="mb-4">
               <h2 className="text-2xl font-bold">Interactive Workflow</h2>
               <p className="text-slate-500 text-sm">Drag nodes, connect handles, or ask AI to expand the system.</p>
            </div>
            <div className="flex-1">
               <WorkflowEditor 
                  key={`workflow-${state.graph.version}`}
                  initialNodes={state.graph.nodes}
                  initialEdges={state.graph.edges}
                  geminiService={geminiService}
                  onGraphUpdate={handleGraphUpdate}
                  onSave={handleFinalize}
               />
            </div>
          </div>
        )}

        {/* Summary Step */}
        {state.step === 'summary' && (
            <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-500">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    <div className="bg-slate-900 text-white p-8">
                        <div className="flex items-center gap-3 mb-4 text-emerald-400">
                            <FileText className="w-6 h-6" />
                            <span className="font-bold uppercase tracking-wider text-sm">Architecture Brief</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{state.idea}</h2>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                           <span className="capitalize">{state.config.workflowComplexity} Diagram</span>
                           <span>•</span>
                           <span className="capitalize">{state.config.workflowType}</span>
                        </div>
                    </div>
                    <div className="p-8 prose prose-slate max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                            {generatedDescription}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-3">
                        <button onClick={() => goToStep('workflow')} className="text-slate-600 font-semibold px-4 py-2 hover:bg-slate-200 rounded-lg transition-colors">
                            Back to Editor
                        </button>
                        <button className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                            Export PDF (Demo)
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
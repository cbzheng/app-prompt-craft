export interface AppFeature {
  id: string;
  title: string;
  description: string;
  selected: boolean;
}

export type FeatureStyle = 'standard' | 'creative';
export type WorkflowComplexity = 'simple' | 'complex';
export type WorkflowType = 'full-stack' | 'frontend-only' | 'backend-focus';
export type SummaryLength = 'short' | 'detailed';
export type ProductScope = 'mvp' | 'complete';

export interface GenerationConfig {
  featureStyle: FeatureStyle;
  workflowComplexity: WorkflowComplexity;
  workflowType: WorkflowType;
  summaryLength: SummaryLength;
  productScope: ProductScope;
}

export interface GraphData {
  nodes: any[];
  edges: any[];
  isGenerated: boolean;
  version: number;
}

export type AiProvider = 'gemini' | 'openai';

export interface AppState {
  step: 'setup' | 'ideation' | 'features' | 'workflow' | 'summary';
  apiKey: string;
  provider: AiProvider;
  model: string;
  idea: string;
  features: AppFeature[];
  graph: GraphData;
  config: GenerationConfig;
}

export enum AppModel {
  GEMINI_FLASH = 'gemini-2.5-flash',
  GEMINI_3_PRO = 'gemini-3-pro-preview',
  GPT_4O = 'gpt-4o',
  GPT_35_TURBO = 'gpt-3.5-turbo',
}

export type NodeType = 'view' | 'logic' | 'database' | 'userAction';

export interface WorkflowNodeData {
  label: string;
  details: string;
  type: NodeType;
  isNew?: boolean;
}
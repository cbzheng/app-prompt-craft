import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppFeature, AppModel, GenerationConfig } from "../types";

// Schema for Feature Generation
const featureSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
    },
    required: ["title", "description"],
  },
};

// Schema for Workflow Generation
const workflowSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["view", "logic", "database", "userAction"] },
          label: { type: Type.STRING },
          details: { type: Type.STRING },
          x: { type: Type.NUMBER, description: "X coordinate on a grid (0, 300, 600...)" },
          y: { type: Type.NUMBER, description: "Y coordinate on a grid (0, 200, 400...)" },
        },
        required: ["id", "type", "label", "details", "x", "y"],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          source: { type: Type.STRING },
          target: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ["id", "source", "target"],
      },
    },
  },
  required: ["nodes", "edges"],
};

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async generateFeatures(
    idea: string, 
    style: GenerationConfig['featureStyle'],
    scope: GenerationConfig['productScope']
  ): Promise<Omit<AppFeature, 'selected' | 'id'>[]> {
    if (!this.ai) throw new Error("AI not initialized");

    let styleInstruction = "Focus on standard, essential features for this type of app.";
    if (style === 'creative') {
      styleInstruction = "Think outside the box. Suggest unique, innovative, and differentiating features that make this app stand out.";
    }

    let scopeInstruction = "Create a balanced set of features for a standard release.";
    if (scope === 'mvp') {
      scopeInstruction = "Strictly focus on a Minimum Viable Product (MVP). List ONLY the absolute critical core features required to validate the idea. Keep it lean and simple.";
    } else if (scope === 'complete') {
      scopeInstruction = "Design a complete, production-ready product. Include comprehensive features, including user settings, administration, edge-case handling, and advanced functionality.";
    }

    const prompt = `Generate a list of feature cards for a web/mobile application based on this idea: "${idea}". 
    
    Style: ${styleInstruction}
    Scope: ${scopeInstruction}

    Focus on interactive and functional features. Return a JSON array.`;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: featureSchema,
        systemInstruction: "You are an expert product manager.",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  }

  async generateWorkflow(
    idea: string, 
    features: AppFeature[], 
    complexity: GenerationConfig['workflowComplexity'], 
    type: GenerationConfig['workflowType']
  ) {
    if (!this.ai) throw new Error("AI not initialized");

    const featureList = features.map(f => `${f.title}: ${f.description}`).join('\n');
    
    let complexityInstruction = "Create a clear, high-level workflow.";
    if (complexity === 'complex') {
        complexityInstruction = "Create a comprehensive, detailed workflow.";
    }

    let typeInstruction = "Include all types of nodes: views, logic, database, user actions.";
    if (type === 'frontend-only') {
      typeInstruction = "Focus strictly on Views and Client-side Logic. Do NOT include Database nodes. Simulate backend calls with Logic nodes.";
    } else if (type === 'backend-focus') {
      typeInstruction = "Focus heavily on Logic, API endpoints, and Database interactions. Minimize Views, only showing key entry points.";
    }

    const prompt = `Create a node-based workflow for an app with these features:
    Idea: ${idea}
    Features:
    ${featureList}
    
    Goal: ${complexityInstruction} Design a logical flow of the application.
    Scope: ${typeInstruction}

    Return a JSON structure with 'nodes' and 'edges'. 
    Nodes must have x,y coordinates spaced out logically (approx 250-300px gap).
    Node types: 'view' (UI screens), 'logic' (functions/api calls), 'database' (storage), 'userAction' (clicks).
    `;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: workflowSchema,
        systemInstruction: "You are a software architect specializing in React Flow diagrams.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");
    return JSON.parse(text);
  }

  async extendWorkflow(currentNodes: any[], currentEdges: any[], request: string) {
    if (!this.ai) throw new Error("AI not initialized");

    const context = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
    
    const prompt = `
    Existing Workflow JSON: ${context}
    
    User Request: "Add a feature: ${request}"
    
    Generate ONLY the NEW nodes and NEW edges required to implement this feature into the existing workflow.
    - Connect new nodes to relevant existing nodes by ID.
    - Do NOT return the old nodes/edges, only the new ones.
    - Ensure new nodes have distinct IDs (e.g., prefix with 'new-').
    - Place new nodes at x,y coordinates that don't overlap heavily with existing ones.
    `;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: workflowSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");
    return JSON.parse(text);
  }

  async generateDescription(
    idea: string, 
    nodes: any[], 
    edges: any[], 
    length: GenerationConfig['summaryLength']
  ): Promise<string> {
    if (!this.ai) throw new Error("AI not initialized");

    const workflowContext = JSON.stringify({ nodes: nodes.map((n:any) => ({ label: n.data.label, type: n.data.type, details: n.data.details })), edges: edges.length });
    
    let lengthInstruction = "Write a concise 1-paragraph summary abstract.";
    if (length === 'detailed') {
      lengthInstruction = "Write a comprehensive technical document including architecture overview, user flow breakdown, and data handling details. Use Markdown formatting with headers.";
    }

    const prompt = `Based on the following workflow design, write a professional technical explanation for the application "${idea}".
    
    Workflow Summary: ${workflowContext}
    
    Instruction: ${lengthInstruction}
    
    Include:
    1. Summary of the architecture.
    2. Key interactions described in the diagram.
    `;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    return response.text || "Could not generate description.";
  }
}
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppFeature, GenerationConfig, AiProvider } from "../types";

// Schema for Feature Generation (Gemini)
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

// Schema for Workflow Generation (Gemini)
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

export class AiService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string;
  private modelName: string;
  private provider: AiProvider;

  constructor(apiKey: string, modelName: string, provider: AiProvider) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.provider = provider;
    
    if (this.provider === 'gemini') {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  // --- OpenAI Helper ---
  private async callOpenAI(systemInstruction: string, prompt: string, requireJson: boolean = false): Promise<any> {
    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ];

    const body: any = {
      model: this.modelName,
      messages: messages,
    };

    if (requireJson) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API Error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    if (requireJson) {
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse OpenAI JSON", content);
            throw new Error("Invalid JSON response from OpenAI");
        }
    }
    return content;
  }

  // --- Public Methods ---

  async generateFeatures(
    idea: string, 
    style: GenerationConfig['featureStyle'],
    scope: GenerationConfig['productScope']
  ): Promise<Omit<AppFeature, 'selected' | 'id'>[]> {
    
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

    const basePrompt = `Generate a list of feature cards for a web/mobile application based on this idea: "${idea}". 
    
    Style: ${styleInstruction}
    Scope: ${scopeInstruction}

    Focus on interactive and functional features.`;

    // GEMINI IMPLEMENTATION
    if (this.provider === 'gemini') {
        if (!this.ai) throw new Error("AI not initialized");
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: basePrompt + " Return a JSON array.",
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
    
    // OPENAI IMPLEMENTATION
    else {
        const prompt = basePrompt + `
        Return a JSON object with a key "features" which is an array of objects.
        Each object must have "title" and "description" fields.
        Example: { "features": [{ "title": "Login", "description": "..." }] }
        `;
        const result = await this.callOpenAI("You are an expert product manager. Output valid JSON.", prompt, true);
        return result.features || [];
    }
  }

  async generateWorkflow(
    idea: string, 
    features: AppFeature[], 
    complexity: GenerationConfig['workflowComplexity'], 
    type: GenerationConfig['workflowType']
  ) {
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
    Nodes must have x,y coordinates spaced out logically (approx 250-300px gap) to form a visual flow.
    Node types: 'view' (UI screens), 'logic' (functions/api calls), 'database' (storage), 'userAction' (clicks).
    
    Structure:
    {
      "nodes": [{ "id": "1", "type": "view", "label": "Home", "details": "...", "x": 0, "y": 0 }],
      "edges": [{ "id": "e1", "source": "1", "target": "2", "label": "Click" }]
    }
    `;

    // GEMINI
    if (this.provider === 'gemini') {
        if (!this.ai) throw new Error("AI not initialized");
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
    
    // OPENAI
    else {
        const result = await this.callOpenAI("You are a software architect specializing in React Flow diagrams. Output valid JSON.", prompt, true);
        return result;
    }
  }

  async extendWorkflow(currentNodes: any[], currentEdges: any[], request: string) {
    const context = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
    
    const prompt = `
    Existing Workflow JSON: ${context}
    
    User Request: "Add a feature: ${request}"
    
    Generate ONLY the NEW nodes and NEW edges required to implement this feature into the existing workflow.
    - Connect new nodes to relevant existing nodes by ID.
    - Do NOT return the old nodes/edges, only the new ones.
    - Ensure new nodes have distinct IDs (e.g., prefix with 'new-').
    - Place new nodes at x,y coordinates that don't overlap heavily with existing ones.
    
    Return JSON format: { "nodes": [...], "edges": [...] }
    `;

    // GEMINI
    if (this.provider === 'gemini') {
        if (!this.ai) throw new Error("AI not initialized");
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
    
    // OPENAI
    else {
        const result = await this.callOpenAI("You are a software architect. Output valid JSON.", prompt, true);
        return result;
    }
  }

  async generateDescription(
    idea: string, 
    nodes: any[], 
    edges: any[], 
    length: GenerationConfig['summaryLength']
  ): Promise<string> {
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

    // GEMINI
    if (this.provider === 'gemini') {
        if (!this.ai) throw new Error("AI not initialized");
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
        });
        return response.text || "Could not generate description.";
    } 
    
    // OPENAI
    else {
        return await this.callOpenAI("You are a technical writer.", prompt, false);
    }
  }
}
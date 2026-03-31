// ─── AI Provider Interface ─────────────────────────────────────────────────────

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProvider {
  name: string;
  chat(messages: AIMessage[], systemPrompt?: string): Promise<string>;
}

export interface AIProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  name?: string;
}

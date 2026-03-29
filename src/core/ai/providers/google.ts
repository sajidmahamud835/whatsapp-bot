import type { AIProvider, AIMessage, AIProviderOptions } from '../types.js';

export class GoogleProvider implements AIProvider {
  name = 'google';
  private opts: AIProviderOptions;

  constructor(opts: AIProviderOptions) {
    this.opts = opts;
  }

  async chat(messages: AIMessage[], systemPrompt?: string): Promise<string> {
    const model = this.opts.model ?? 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.opts.apiKey}`;

    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = { contents };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    body.generationConfig = {
      maxOutputTokens: this.opts.maxTokens ?? 500,
      temperature: this.opts.temperature ?? 0.7,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Gemini API error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }
}

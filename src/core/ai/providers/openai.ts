import type { AIProvider, AIMessage, AIProviderOptions } from '../types.js';

/**
 * OpenAI-compatible provider.
 * Works for OpenAI, OpenRouter, Ollama, Together, or any OpenAI-compatible endpoint.
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private opts: AIProviderOptions;

  constructor(opts: AIProviderOptions) {
    this.opts = opts;
  }

  async chat(messages: AIMessage[], systemPrompt?: string): Promise<string> {
    const baseUrl = this.opts.baseUrl ?? 'https://api.openai.com/v1';
    const model = this.opts.model ?? 'gpt-4o-mini';

    const fullMessages: AIMessage[] = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...messages);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: this.opts.maxTokens ?? 500,
        temperature: this.opts.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
}

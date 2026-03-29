import type { AIProvider, AIMessage, AIProviderOptions } from '../types.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private opts: AIProviderOptions;

  constructor(opts: AIProviderOptions) {
    this.opts = opts;
  }

  async chat(messages: AIMessage[], systemPrompt?: string): Promise<string> {
    const model = this.opts.model ?? 'claude-3-haiku-20240307';

    // Anthropic doesn't allow system messages in the messages array
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: this.opts.maxTokens ?? 500,
      messages: filteredMessages.map(m => ({ role: m.role, content: m.content })),
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.opts.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    const block = data.content?.[0];
    return (block?.text ?? '').trim();
  }
}

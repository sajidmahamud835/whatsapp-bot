import type { AIProvider, AIMessage } from './types.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GoogleProvider } from './providers/google.js';
import { config } from '../config.js';
import { childLogger } from '../logger.js';
import { aiHistoryStore } from '../db/ai-history-store.js';

const log = childLogger('ai-manager');

const MAX_HISTORY = 10;

class AIManager {
  private providers = new Map<string, AIProvider>();
  private _initialized = false;

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;
    this._loadProviders();
  }

  private _loadProviders(): void {
    const aiConfig = config.get<any>('ai');
    if (!aiConfig?.providers) return;

    for (const [name, providerCfg] of Object.entries(aiConfig.providers as Record<string, any>)) {
      if (!providerCfg?.apiKey) continue;

      const opts = {
        apiKey: providerCfg.apiKey as string,
        model: providerCfg.model as string | undefined,
        baseUrl: providerCfg.baseUrl as string | undefined,
        maxTokens: aiConfig.maxTokens ?? 500,
        temperature: aiConfig.temperature ?? 0.7,
      };

      try {
        const type = providerCfg.type ?? name;
        if (type === 'openai' || type === 'openrouter' || type === 'ollama') {
          this.providers.set(name, new OpenAIProvider({ ...opts, name }));
        } else if (type === 'anthropic') {
          this.providers.set(name, new AnthropicProvider(opts));
        } else if (type === 'google' || type === 'gemini') {
          this.providers.set(name, new GoogleProvider(opts));
        } else {
          // Assume OpenAI-compatible by default
          this.providers.set(name, new OpenAIProvider({ ...opts, name }));
        }
        log.info('AI provider loaded: %s', name);
      } catch (err) {
        log.error('Failed to load AI provider %s: %s', name, err instanceof Error ? err.message : String(err));
      }
    }
  }

  reload(): void {
    this.providers.clear();
    this._initialized = false;
    this.initialize();
  }

  isEnabled(): boolean {
    return config.get<boolean>('ai.enabled') ?? false;
  }

  getProviders(): string[] {
    return [...this.providers.keys()];
  }

  getProvider(name?: string): AIProvider | undefined {
    const providerName = name ?? config.get<string>('ai.defaultProvider') ?? '';
    if (providerName && this.providers.has(providerName)) {
      return this.providers.get(providerName);
    }
    // Return first available
    const first = this.providers.values().next();
    return first.done ? undefined : first.value;
  }

  /**
   * Chat with the AI — includes conversation context per JID.
   * Falls back through available providers on error.
   */
  async chat(jid: string, userMessage: string, providerName?: string): Promise<string> {
    if (!this.isEnabled()) throw new Error('AI is not enabled');

    if (!this._initialized) this.initialize();

    const systemPrompt = config.get<string>('ai.systemPrompt') || 'You are a helpful WhatsApp assistant.';

    // Build conversation history from persistent store
    aiHistoryStore.appendMessage(jid, 'user', userMessage);
    const history = aiHistoryStore.getHistory(jid, MAX_HISTORY);

    // Try primary provider, then fall back through rest
    const allProviderNames = providerName
      ? [providerName, ...this.getProviders().filter(n => n !== providerName)]
      : this.getProviders();

    let lastError: Error | undefined;
    for (const pName of allProviderNames) {
      const provider = this.providers.get(pName);
      if (!provider) continue;

      try {
        const response = await provider.chat(history, systemPrompt);

        // Save assistant response to persistent store
        aiHistoryStore.appendMessage(jid, 'assistant', response);

        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        log.warn('AI provider %s failed: %s — trying next', pName, lastError.message);
      }
    }

    throw lastError ?? new Error('No AI providers available');
  }

  /**
   * Clear conversation history for a JID.
   */
  clearHistory(jid: string): void {
    aiHistoryStore.clearHistory(jid);
  }

  /**
   * Get conversation history for a JID.
   */
  getHistory(jid: string): AIMessage[] {
    return aiHistoryStore.getHistory(jid, MAX_HISTORY);
  }

  /**
   * Update system prompt in config.
   */
  updateSystemPrompt(prompt: string): void {
    config.set('ai.systemPrompt', prompt);
  }
}

export const aiManager = new AIManager();

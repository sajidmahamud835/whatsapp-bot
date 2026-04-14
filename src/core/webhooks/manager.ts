import { createHmac, randomUUID } from 'crypto';
import axios from 'axios';
import type { RegisteredWebhook } from './types.js';
import { config } from '../config.js';
import { childLogger } from '../logger.js';
import { eventBus } from '../events.js';
import { webhookLogStore } from '../db/webhook-log-store.js';
import type { WaConvoEventName } from '../types.js';

const log = childLogger('webhook-manager');

const RETRY_DELAYS = [1000, 5000, 30_000, 300_000]; // 1s, 5s, 30s, 5min
const MAX_RETRIES = 4;

class WebhookManager {
  private webhooks = new Map<string, RegisteredWebhook>();
  private _initialized = false;

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;
    this._loadWebhooks();
    this._subscribeToEvents();

    // Auto-migrate legacy WEBHOOK_URL env var
    const legacyUrl = process.env['WEBHOOK_URL'] ?? process.env['POST_API'] ?? '';
    if (legacyUrl && this.webhooks.size === 0) {
      log.warn('WEBHOOK_URL env var detected — auto-migrating to webhook system. Set up webhooks via API instead.');
      this.register({ url: legacyUrl, events: ['message.received'], secret: '', enabled: true });
    }
  }

  private _loadWebhooks(): void {
    const webhooks = config.get<RegisteredWebhook[]>('integrations.webhooks') ?? [];
    for (const wh of webhooks) {
      if (wh.id) {
        this.webhooks.set(wh.id, wh);
      }
    }
    log.info('Loaded %d webhook(s)', this.webhooks.size);
  }

  private _saveWebhooks(): void {
    config.set('integrations.webhooks', [...this.webhooks.values()]);
  }

  private _subscribeToEvents(): void {
    const allEvents: WaConvoEventName[] = [
      'message.received', 'message.sent',
      'client.connected', 'client.disconnected', 'client.qr', 'client.ready', 'client.error',
      'group.joined', 'group.left',
      'server.started', 'server.stopped',
    ];

    for (const eventName of allEvents) {
      eventBus.on(eventName, (data) => {
        this._dispatch(eventName, data);
      });
    }
  }

  private async _dispatch(event: string, data: unknown): Promise<void> {
    for (const webhook of this.webhooks.values()) {
      if (!webhook.enabled) continue;

      const subscribed = webhook.events.includes('*') || webhook.events.includes(event);
      if (!subscribed) continue;

      // Fire and forget — don't block the event bus
      this._deliverWithRetry(webhook, event, data, 0).catch(() => {});
    }
  }

  private async _deliverWithRetry(webhook: RegisteredWebhook, event: string, data: unknown, attempt: number): Promise<void> {
    const payload = JSON.stringify({ event, data, timestamp: Date.now() });
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // HMAC signature if secret is configured
      if (webhook.secret) {
        const signature = createHmac('sha256', webhook.secret).update(payload).digest('hex');
        headers['X-WA-Signature-256'] = `sha256=${signature}`;
      }

      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 10_000,
      });

      const responseTime = Date.now() - startTime;

      webhookLogStore.log({
        webhook_id: webhook.id,
        event,
        status_code: response.status,
        response_time_ms: responseTime,
        error: null,
      });
    } catch (err) {
      const responseTime = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);
      const statusCode = (err as any)?.response?.status ?? null;

      webhookLogStore.log({
        webhook_id: webhook.id,
        event,
        status_code: statusCode,
        response_time_ms: responseTime,
        error: errMsg,
      });

      // Retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] ?? 300_000;
        log.warn({ webhookId: webhook.id, attempt: attempt + 1 }, 'Webhook delivery failed, retrying in %dms: %s', delay, errMsg);
        setTimeout(() => {
          this._deliverWithRetry(webhook, event, data, attempt + 1).catch(() => {});
        }, delay);
      } else {
        log.error({ webhookId: webhook.id }, 'Webhook delivery failed after %d attempts: %s', MAX_RETRIES + 1, errMsg);
      }
    }
  }

  // ─── Public CRUD ─────────────────────────────────────────────────────────────

  register(opts: { url: string; events?: string[]; secret?: string; enabled?: boolean }): RegisteredWebhook {
    const now = new Date().toISOString();
    const webhook: RegisteredWebhook = {
      id: randomUUID(),
      url: opts.url,
      events: opts.events ?? ['*'],
      secret: opts.secret ?? '',
      enabled: opts.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.webhooks.set(webhook.id, webhook);
    this._saveWebhooks();
    log.info({ webhookId: webhook.id }, 'Webhook registered: %s', webhook.url);
    return webhook;
  }

  update(id: string, updates: Partial<Pick<RegisteredWebhook, 'url' | 'events' | 'secret' | 'enabled'>>): RegisteredWebhook {
    const webhook = this.webhooks.get(id);
    if (!webhook) throw new Error(`Webhook ${id} not found`);

    const updated: RegisteredWebhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.webhooks.set(id, updated);
    this._saveWebhooks();
    return updated;
  }

  delete(id: string): void {
    if (!this.webhooks.has(id)) throw new Error(`Webhook ${id} not found`);
    this.webhooks.delete(id);
    this._saveWebhooks();
    log.info({ webhookId: id }, 'Webhook deleted');
  }

  get(id: string): RegisteredWebhook | undefined {
    return this.webhooks.get(id);
  }

  list(): RegisteredWebhook[] {
    return [...this.webhooks.values()];
  }

  async test(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const webhook = this.webhooks.get(id);
    if (!webhook) throw new Error(`Webhook ${id} not found`);

    const payload = JSON.stringify({
      event: 'webhook.test',
      data: { message: 'Test webhook delivery from WA Convo' },
      timestamp: Date.now(),
    });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhook.secret) {
        const signature = createHmac('sha256', webhook.secret).update(payload).digest('hex');
        headers['X-WA-Signature-256'] = `sha256=${signature}`;
      }

      const response = await axios.post(webhook.url, payload, { headers, timeout: 10_000 });
      return { success: true, statusCode: response.status };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { success: false, statusCode: (err as any)?.response?.status, error: errMsg };
    }
  }
}

export const webhookManager = new WebhookManager();

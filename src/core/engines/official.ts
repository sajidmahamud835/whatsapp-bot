import { childLogger } from '../logger.js';
import { eventBus } from '../events.js';
import type { WhatsAppEngine, OfficialEngineConfig } from './types.js';

const log = childLogger('official-engine');

// WhatsApp Cloud API base URL
const GRAPH_BASE = 'https://graph.facebook.com';

export class OfficialEngine implements WhatsAppEngine {
  id: string;
  type: 'official' = 'official';
  status: 'disconnected' | 'connecting' | 'connected' | 'qr' = 'disconnected';
  phone?: string;
  name?: string;

  private cfg: OfficialEngineConfig;

  constructor(id: string, cfg: OfficialEngineConfig) {
    this.id = id;
    this.cfg = cfg;
  }

  get apiVersion(): string {
    return this.cfg.apiVersion ?? 'v21.0';
  }

  get phoneNumberId(): string {
    return this.cfg.phoneNumberId;
  }

  get accessToken(): string {
    return this.cfg.accessToken;
  }

  get verifyToken(): string {
    return this.cfg.verifyToken ?? '';
  }

  private get messagesUrl(): string {
    return `${GRAPH_BASE}/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  private async post(body: Record<string, unknown>): Promise<any> {
    const res = await fetch(this.messagesUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      const errMsg = data?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`WhatsApp Cloud API error: ${errMsg}`);
    }

    return data;
  }

  async initialize(): Promise<void> {
    // Official API is stateless — just mark connected
    this.status = 'connected';
    log.info({ clientId: this.id }, 'Official WhatsApp Cloud API engine initialized');
    eventBus.emit('client.connected', { clientId: this.id, phone: this.phone ?? null, name: this.name ?? null });
    eventBus.emit('client.ready', { clientId: this.id, phone: this.phone ?? null, name: this.name ?? null });
  }

  async sendText(jid: string, text: string): Promise<any> {
    const to = this._normalizePhone(jid);
    return this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    });
  }

  async sendMedia(jid: string, type: string, url: string, caption = ''): Promise<any> {
    const to = this._normalizePhone(jid);
    const mediaType = this._resolveMediaType(type);

    return this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: mediaType,
      [mediaType]: { link: url, caption },
    });
  }

  async sendLocation(jid: string, lat: number, lng: number, name = ''): Promise<any> {
    const to = this._normalizePhone(jid);
    return this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'location',
      location: { latitude: lat, longitude: lng, name },
    });
  }

  async sendReaction(jid: string, key: any, emoji: string): Promise<any> {
    const to = this._normalizePhone(jid);
    const messageId = typeof key === 'string' ? key : key?.id ?? '';
    return this.post({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    });
  }

  async sendTemplate(jid: string, templateName: string, languageCode = 'en_US', components: unknown[] = []): Promise<any> {
    const to = this._normalizePhone(jid);
    return this.post({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  async markRead(messageId: string): Promise<any> {
    return this.post({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  /**
   * Handle an incoming webhook payload from Meta.
   * Parses messages and emits message.received events.
   */
  handleWebhook(payload: any): void {
    try {
      const entries: any[] = payload?.entry ?? [];
      for (const entry of entries) {
        const changes: any[] = entry?.changes ?? [];
        for (const change of changes) {
          const value = change?.value;
          if (!value || value.messaging_product !== 'whatsapp') continue;

          const messages: any[] = value.messages ?? [];
          for (const msg of messages) {
            const from = msg.from as string;
            const body = msg.text?.body ?? '';
            const type = msg.type ?? 'unknown';
            const timestamp = parseInt(msg.timestamp ?? '0', 10);

            log.debug({ clientId: this.id, from }, 'Meta webhook message: %s', body);

            eventBus.emit('message.received', {
              clientId: this.id,
              from: `${from}@s.whatsapp.net`,
              body,
              timestamp,
              isGroup: false,
              hasMedia: ['image', 'video', 'audio', 'document', 'sticker'].includes(type),
              type,
              raw: msg,
            });
          }
        }
      }
    } catch (err) {
      log.error({ clientId: this.id }, 'Error handling Meta webhook: %s', err instanceof Error ? err.message : String(err));
    }
  }

  async logout(): Promise<void> {
    // Official API is stateless, nothing to log out
    this.status = 'disconnected';
    log.info({ clientId: this.id }, 'Official engine disconnected');
  }

  async destroy(): Promise<void> {
    this.status = 'disconnected';
  }

  private _normalizePhone(jid: string): string {
    // Remove @s.whatsapp.net or @g.us suffix
    return jid.replace(/@[^@]+$/, '').replace(/^\+/, '');
  }

  private _resolveMediaType(type: string): string {
    const t = type.toLowerCase();
    if (t === 'image' || t.startsWith('image/')) return 'image';
    if (t === 'video' || t.startsWith('video/')) return 'video';
    if (t === 'audio' || t.startsWith('audio/')) return 'audio';
    return 'document';
  }
}

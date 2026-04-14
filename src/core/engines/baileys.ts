import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import path from 'path';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { WhatsAppEngine } from './types.js';
import { config } from '../config.js';
import { baileysLogger, childLogger } from '../logger.js';
import { eventBus } from '../events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = childLogger('baileys-engine');

function getAuthDir(): string {
  const authDir = config.get<string>('clients.authDir') ?? '.auth';
  return resolve(__dirname, '..', '..', '..', authDir);
}

export class BaileysEngine implements WhatsAppEngine {
  id: string;
  type: 'baileys' = 'baileys';
  status: 'disconnected' | 'connecting' | 'connected' | 'qr' = 'disconnected';
  phone?: string;
  name?: string;

  private sock: WASocket | null = null;
  private _initialized = false;

  constructor(id: string) {
    this.id = id;
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    this.status = 'connecting';
    await this._connect();
  }

  private async _connect(): Promise<void> {
    const id = this.id;
    const authFolder = path.join(getAuthDir(), `session-${id}`);

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock: WASocket = makeWASocket({
      version,
      logger: baileysLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      printQRInTerminal: true,
      browser: ['WA Convo', 'Chrome', '4.2.0'],
      generateHighQualityLinkPreview: false,
    });

    this.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        log.info({ clientId: id }, 'QR received');
        this.status = 'qr';
        eventBus.emit('client.qr', { clientId: id, qr });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        log.warn({ clientId: id, statusCode, shouldReconnect }, 'Connection closed');
        this.status = 'disconnected';
        this.phone = undefined;
        this.name = undefined;
        eventBus.emit('client.disconnected', { clientId: id, phone: null, name: null });

        if (shouldReconnect && this._initialized) {
          log.info({ clientId: id }, 'Reconnecting…');
          await this._connect();
        } else {
          this._initialized = false;
          this.sock = null;
        }
      }

      if (connection === 'open') {
        log.info({ clientId: id }, 'Connected ✓');
        this.status = 'connected';

        const me = sock.user;
        if (me) {
          this.phone = jidNormalizedUser(me.id).split('@')[0];
          this.name = me.name;
        }

        eventBus.emit('client.connected', { clientId: id, phone: this.phone ?? null, name: this.name ?? null });
        eventBus.emit('client.ready', { clientId: id, phone: this.phone ?? null, name: this.name ?? null });
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      const webhookUrl = process.env['WEBHOOK_URL'] ?? process.env['POST_API'] ?? '';

      for (const msg of messages) {
        if (!msg.message || isJidBroadcast(msg.key.remoteJid ?? '')) continue;

        const from = msg.key.remoteJid ?? '';
        const body =
          msg.message.conversation ??
          msg.message.extendedTextMessage?.text ??
          '';
        const isGroup = from.endsWith('@g.us');
        const timestamp = typeof msg.messageTimestamp === 'number'
          ? msg.messageTimestamp
          : Number(msg.messageTimestamp ?? 0);
        const hasMedia = !!(
          msg.message.imageMessage ??
          msg.message.videoMessage ??
          msg.message.documentMessage ??
          msg.message.audioMessage
        );

        log.debug({ clientId: id, from }, 'Message received: %s', body);

        eventBus.emit('message.received', {
          clientId: id,
          from,
          body,
          timestamp,
          isGroup,
          hasMedia,
          type: Object.keys(msg.message)[0] ?? 'unknown',
          raw: msg,
        });

        if (body === '!ping') {
          await sock.sendMessage(from, { text: 'pong' }, { quoted: msg });
        }

        if (webhookUrl) {
          try {
            const payload = {
              instanceId: id,
              id: msg.key,
              body,
              from,
              to: jidNormalizedUser(sock.user?.id ?? ''),
              type: Object.keys(msg.message)[0] ?? 'unknown',
              timestamp,
              hasMedia,
              isGroup,
            };
            const response = await axios.post(webhookUrl, payload, { timeout: 10_000 });
            if (response.data?.reply) {
              await sock.sendMessage(from, { text: String(response.data.reply) }, { quoted: msg });
            }
          } catch (err: unknown) {
            log.error({ clientId: id }, 'Webhook error: %s', err instanceof Error ? err.message : String(err));
          }
        }
      }
    });
  }

  async sendText(jid: string, text: string): Promise<any> {
    if (!this.sock) throw new Error(`Session ${this.id} not connected`);
    return this.sock.sendMessage(jid, { text });
  }

  async sendMedia(jid: string, type: string, url: string, caption = ''): Promise<any> {
    if (!this.sock) throw new Error(`Session ${this.id} not connected`);
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 30_000 });
    const buffer = Buffer.from(response.data);
    const contentType = String(response.headers['content-type'] ?? 'image/jpeg');
    const mimeType = contentType.split(';')[0]?.trim() ?? 'image/jpeg';

    if (type === 'image' || mimeType.startsWith('image/')) {
      return this.sock.sendMessage(jid, { image: buffer, caption, mimetype: mimeType });
    } else if (type === 'video' || mimeType.startsWith('video/')) {
      return this.sock.sendMessage(jid, { video: buffer, caption, mimetype: mimeType });
    } else {
      const fileName = url.split('/').pop() ?? 'file';
      return this.sock.sendMessage(jid, { document: buffer, caption, mimetype: mimeType, fileName });
    }
  }

  async sendLocation(jid: string, lat: number, lng: number, name = ''): Promise<any> {
    if (!this.sock) throw new Error(`Session ${this.id} not connected`);
    return this.sock.sendMessage(jid, {
      location: { degreesLatitude: lat, degreesLongitude: lng, name },
    });
  }

  async sendReaction(jid: string, key: any, emoji: string): Promise<any> {
    if (!this.sock) throw new Error(`Session ${this.id} not connected`);
    return this.sock.sendMessage(jid, { react: { text: emoji, key } });
  }

  getSocket(): WASocket | null {
    return this.sock;
  }

  async logout(): Promise<void> {
    if (!this.sock) throw new Error(`Session ${this.id} not connected`);
    await this.sock.logout();
    this.status = 'disconnected';
    this._initialized = false;
    this.sock = null;
  }

  async destroy(): Promise<void> {
    this._initialized = false;
    this.status = 'disconnected';
    this.phone = undefined;
    this.name = undefined;
    if (this.sock) {
      try { await this.sock.logout(); } catch { /* ignore */ }
      this.sock = null;
    }
  }
}

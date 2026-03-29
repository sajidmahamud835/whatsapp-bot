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
import type { ClientSession, WebhookPayload } from './types.js';
import { config } from './config.js';
import { baileysLogger, childLogger } from './logger.js';
import { eventBus } from './events.js';
import type { WhatsAppEngine } from './engines/types.js';
import { BaileysEngine } from './engines/baileys.js';
import { OfficialEngine } from './engines/official.js';
import { aiManager } from './ai/manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = childLogger('client-manager');

function getAuthDir(): string {
  const authDir = config.get<string>('clients.authDir') ?? '.auth';
  return resolve(__dirname, '..', '..', authDir);
}

function getWebhookUrl(): string {
  return process.env['WEBHOOK_URL'] ?? process.env['POST_API'] ?? '';
}

function getClientCount(): number {
  return config.get<number>('clients.count') ?? 6;
}

export const sessions = new Map<string, ClientSession>();

// ─── Engine registry ──────────────────────────────────────────────────────────

export const engines = new Map<string, WhatsAppEngine>();

/**
 * Create a WhatsApp engine for the given session based on config.
 * Falls back to Baileys if no engine config or engine = "baileys".
 */
export function createEngine(id: string): WhatsAppEngine {
  // Check if there's a sessions config entry for this id
  const sessionConfigs = config.get<any[]>('sessions') ?? [];
  const sessionCfg = sessionConfigs.find((s: any) => String(s.id) === String(id));

  if (sessionCfg?.engine === 'official' && sessionCfg?.official) {
    return new OfficialEngine(id, sessionCfg.official);
  }

  // Default: Baileys
  return new BaileysEngine(id);
}

// ─── JID helpers ─────────────────────────────────────────────────────────────

/**
 * Normalise a bare number like "8801XXXXXXXXX" to a WhatsApp JID.
 * If the value already contains "@" it is returned as-is.
 */
export function toJid(number: string): string {
  if (number.includes('@')) return number;
  const clean = number.replace(/^\+/, '').replace(/\s/g, '');
  return `${clean}@s.whatsapp.net`;
}

// ─── Session factory ──────────────────────────────────────────────────────────

function createEmptySession(id: string): ClientSession {
  return {
    id,
    sock: null,
    isInitialized: false,
    isReady: false,
    qrData: null,
    disconnected: true,
    phone: null,
    name: null,
  };
}

async function connectToWhatsApp(session: ClientSession): Promise<void> {
  const id = session.id;
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
    browser: ['WA Convo', 'Chrome', '4.0.0'],
    generateHighQualityLinkPreview: false,
  });

  session.sock = sock;

  // ── Persist credentials on update ────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Connection state ──────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log.info({ clientId: id }, 'QR received — scan in terminal or GET /%s/qr', id);
      session.qrData = qr;
      session.isReady = false;
      eventBus.emit('client.qr', { clientId: id, qr });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      log.warn({ clientId: id, statusCode, shouldReconnect }, 'Connection closed');

      session.isReady = false;
      session.disconnected = true;
      session.phone = null;
      session.name = null;

      eventBus.emit('client.disconnected', { clientId: id, phone: null, name: null });

      if (shouldReconnect && session.isInitialized) {
        log.info({ clientId: id }, 'Reconnecting…');
        await connectToWhatsApp(session);
      } else {
        // Logged out — reset so user can re-init
        session.isInitialized = false;
        session.sock = null;
      }
    }

    if (connection === 'open') {
      log.info({ clientId: id }, 'Connected ✓');
      session.isReady = true;
      session.disconnected = false;
      session.qrData = null;

      const me = sock.user;
      if (me) {
        session.phone = jidNormalizedUser(me.id).split('@')[0] ?? null;
        session.name = me.name ?? null;
      }

      eventBus.emit('client.connected', {
        clientId: id,
        phone: session.phone,
        name: session.name,
      });
      eventBus.emit('client.ready', {
        clientId: id,
        phone: session.phone,
        name: session.name,
      });
    }
  });

  // ── Incoming messages ─────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const webhookUrl = getWebhookUrl();

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

      // Emit event
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

      // Built-in auto-reply
      if (body === '!ping') {
        await sock.sendMessage(from, { text: 'pong' }, { quoted: msg });
      }

      // Webhook bridge
      if (webhookUrl) {
        try {
          const payload: WebhookPayload = {
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
          if (response.data?.replyMedia) {
            const buf = Buffer.from(String(response.data.replyMedia), 'base64');
            await sock.sendMessage(from, { image: buf }, { quoted: msg });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log.error({ clientId: id }, 'Webhook error: %s', message);
        }
      }
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initializeSessions(): void {
  const count = getClientCount();
  log.info('Initializing %d client slot(s)…', count);
  for (let i = 1; i <= count; i++) {
    const id = String(i);
    sessions.set(id, createEmptySession(id));
  }
  log.info('%d client slot(s) ready. Use /:id/init to start each one.', count);

  // Initialize AI manager
  aiManager.initialize();

  // Wire AI auto-reply
  eventBus.on('message.received', async (event) => {
    if (!aiManager.isEnabled()) return;
    if (!event.body || event.body.startsWith('!')) return; // skip commands

    const session = sessions.get(event.clientId);
    if (!session?.isReady || !session.sock) return;

    try {
      const reply = await aiManager.chat(event.from, event.body);
      if (reply) {
        await session.sock.sendMessage(event.from, { text: reply });
        log.debug({ clientId: event.clientId, to: event.from }, 'AI reply sent');
      }
    } catch (err) {
      log.error({ clientId: event.clientId }, 'AI reply error: %s', err instanceof Error ? err.message : String(err));
    }
  });
}

export function getSession(id: string): ClientSession | undefined {
  return sessions.get(id);
}

export async function startSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) throw new Error(`Session ${id} not found`);
  if (session.isInitialized) throw new Error(`Session ${id} already initializing/active`);
  session.isInitialized = true;

  // Create and register engine
  const engine = createEngine(id);
  engines.set(id, engine);
  // Store engine reference on session for webhook routing
  (session as any).engine = engine;

  await connectToWhatsApp(session);
}

export async function destroySession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;

  session.isInitialized = false;
  session.isReady = false;
  session.disconnected = true;
  session.phone = null;
  session.name = null;

  if (session.sock) {
    try {
      await session.sock.logout();
    } catch {
      // ignore — socket might already be closed
    }
    session.sock = null;
  }
}

export async function logoutSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session || !session.sock) throw new Error(`Session ${id} is not connected`);
  await session.sock.logout();
  session.isReady = false;
  session.disconnected = true;
  session.isInitialized = false;
  session.sock = null;
}

// ─── Messaging helpers ────────────────────────────────────────────────────────

export async function sendText(
  sock: WASocket,
  number: string,
  message: string,
): Promise<string> {
  const jid = toJid(number);
  const result = await sock.sendMessage(jid, { text: message });
  return result?.key.id ?? '';
}

export async function sendMedia(
  sock: WASocket,
  number: string,
  mediaUrl: string,
  caption: string,
): Promise<string> {
  const jid = toJid(number);

  const response = await axios.get<ArrayBuffer>(mediaUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  const buffer = Buffer.from(response.data);
  const contentType = String(response.headers['content-type'] ?? 'image/jpeg');
  const mimeType = contentType.split(';')[0]?.trim() ?? 'image/jpeg';

  let result;
  if (mimeType.startsWith('image/')) {
    result = await sock.sendMessage(jid, { image: buffer, caption, mimetype: mimeType });
  } else if (mimeType.startsWith('video/')) {
    result = await sock.sendMessage(jid, { video: buffer, caption, mimetype: mimeType });
  } else {
    const fileName = mediaUrl.split('/').pop() ?? 'file';
    result = await sock.sendMessage(jid, {
      document: buffer,
      caption,
      mimetype: mimeType,
      fileName,
    });
  }

  return result?.key.id ?? '';
}

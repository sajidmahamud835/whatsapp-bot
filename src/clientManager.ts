import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import type { WASocket, BaileysEventMap } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ClientSession, WebhookPayload } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? process.env.POST_API ?? '';
const CLIENT_COUNT = parseInt(process.env.CLIENT_COUNT ?? '6', 10);

// Silent logger — Baileys is very noisy by default
const logger = pino({ level: 'silent' });

export const sessions = new Map<string, ClientSession>();

// ─── JID helpers ─────────────────────────────────────────────────────────────

/**
 * Normalise a bare number like "8801XXXXXXXXX" to a WhatsApp JID.
 * If the value already contains "@" it is returned as-is.
 */
export function toJid(number: string): string {
  if (number.includes('@')) return number;
  // Strip any leading "+" or spaces
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
  const authFolder = path.join(AUTH_DIR, `session-${id}`);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock: WASocket = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: true,
    browser: ['WhatsApp Bot', 'Chrome', '3.0.0'],
    generateHighQualityLinkPreview: false,
  });

  session.sock = sock;

  // ── Persist credentials on update ────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Connection state ──────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[${id}] QR received — scan in terminal or GET /${id}/qr`);
      session.qrData = qr;
      session.isReady = false;
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[${id}] Connection closed. Status: ${statusCode}, reconnect: ${shouldReconnect}`);

      session.isReady = false;
      session.disconnected = true;
      session.phone = null;
      session.name = null;

      if (shouldReconnect && session.isInitialized) {
        console.log(`[${id}] Reconnecting…`);
        await connectToWhatsApp(session);
      } else {
        // Logged out — reset so user can re-init
        session.isInitialized = false;
        session.sock = null;
      }
    }

    if (connection === 'open') {
      console.log(`[${id}] Connected ✓`);
      session.isReady = true;
      session.disconnected = false;
      session.qrData = null;

      const me = sock.user;
      if (me) {
        session.phone = jidNormalizedUser(me.id).split('@')[0] ?? null;
        session.name = me.name ?? null;
      }
    }
  });

  // ── Incoming messages ─────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

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

      console.log(`[${id}] Message from ${from}: ${body}`);

      // Built-in auto-reply
      if (body === '!ping') {
        await sock.sendMessage(from, { text: 'pong' }, { quoted: msg });
      }

      // Webhook bridge
      if (WEBHOOK_URL) {
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

          const response = await axios.post(WEBHOOK_URL, payload, { timeout: 10_000 });

          if (response.data?.reply) {
            await sock.sendMessage(from, { text: String(response.data.reply) }, { quoted: msg });
          }
          if (response.data?.replyMedia) {
            const buf = Buffer.from(String(response.data.replyMedia), 'base64');
            await sock.sendMessage(from, { image: buf }, { quoted: msg });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[${id}] Webhook error: ${message}`);
        }
      }
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initializeSessions(): void {
  console.log(`Initializing ${CLIENT_COUNT} client slot(s)…`);
  for (let i = 1; i <= CLIENT_COUNT; i++) {
    const id = String(i);
    sessions.set(id, createEmptySession(id));
  }
  console.log(`${CLIENT_COUNT} client slot(s) ready. Use /:id/init to start each one.`);
}

export function getSession(id: string): ClientSession | undefined {
  return sessions.get(id);
}

export async function startSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) throw new Error(`Session ${id} not found`);
  if (session.isInitialized) throw new Error(`Session ${id} already initializing/active`);
  session.isInitialized = true;
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
    // Send as document for all other types
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

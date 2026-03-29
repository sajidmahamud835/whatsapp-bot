import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import axios from 'axios';
import type { ClientSession, WebhookPayload } from './types.js';

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? process.env.POST_API ?? '';
const CLIENT_COUNT = parseInt(process.env.CLIENT_COUNT ?? '6', 10);

export const sessions = new Map<string, ClientSession>();

function buildPuppeteerConfig(): Record<string, unknown> {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  };
}

function createClientSession(id: string): ClientSession {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id }),
    puppeteer: buildPuppeteerConfig(),
  });

  const session: ClientSession = {
    id,
    client,
    isInitialized: false,
    isReady: false,
    qrData: null,
    disconnected: true,
  };

  // QR event
  client.on('qr', (qr: string) => {
    console.log(`[${id}] QR received`);
    qrcode.toDataURL(qr, (_err: Error | null | undefined, url: string) => {
      session.qrData = url;
    });
  });

  // Authenticated
  client.on('authenticated', () => {
    console.log(`[${id}] Authenticated`);
    session.disconnected = false;
  });

  // Ready
  client.on('ready', () => {
    console.log(`[${id}] Ready`);
    session.isReady = true;
    session.disconnected = false;
  });

  // Disconnected
  client.on('disconnected', (reason: string) => {
    console.log(`[${id}] Disconnected: ${reason}`);
    session.isReady = false;
    session.disconnected = true;
    session.isInitialized = false;
  });

  // Incoming message
  client.on('message', async (msg) => {
    console.log(`[${id}] Message from ${msg.from}: ${msg.body}`);

    // Built-in auto-replies
    if (msg.body === '!ping') {
      await msg.reply('pong');
    }

    // Webhook bridge
    if (WEBHOOK_URL) {
      try {
        const payload: WebhookPayload = {
          instanceId: id,
          id: msg.id,
          body: msg.body,
          from: msg.from,
          to: msg.to,
          type: msg.type,
          timestamp: msg.timestamp,
          hasMedia: msg.hasMedia,
          isGroup: (msg.from ?? '').endsWith('@g.us'),
        };
        const response = await axios.post(WEBHOOK_URL, payload, { timeout: 10_000 });

        if (response.data?.reply) {
          await msg.reply(String(response.data.reply));
        }
        if (response.data?.replyMedia) {
          const { MessageMedia } = await import('whatsapp-web.js');
          const media = new MessageMedia('image/jpeg', String(response.data.replyMedia));
          await msg.reply(media);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${id}] Webhook error: ${message}`);
      }
    }
  });

  return session;
}

export function initializeSessions(): void {
  console.log(`Initializing ${CLIENT_COUNT} client slot(s)…`);
  for (let i = 1; i <= CLIENT_COUNT; i++) {
    const id = String(i);
    const session = createClientSession(id);
    sessions.set(id, session);
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
  await session.client.initialize();
}

export async function destroySession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;
  await session.client.destroy();
  session.isInitialized = false;
  session.isReady = false;
  session.disconnected = true;
}

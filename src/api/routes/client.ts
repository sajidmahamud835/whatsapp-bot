import { Router } from 'express';
import type { Request, Response } from 'express';
import { sessions, startSession, destroySession, logoutSession, sendText, sendMedia, toJid } from '../../core/client-manager.js';
import type {
  SendMessageBody,
  SendMediaBody,
  SendBulkBody,
  SendButtonsBody,
  BulkResult,
} from '../../core/types.js';
import { validate } from '../middleware/validate.js';
import { bodyLimit } from '../middleware/body-limit.js';
import { sendMessageSchema, sendMediaSchema, sendBulkSchema, sendButtonsSchema } from '../schemas/client.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSessionOrError(id: string, res: Response) {
  const session = sessions.get(id);
  if (!session) {
    res.status(404).json({ error: 'Not Found', message: `Client ${id} does not exist` });
    return null;
  }
  return session;
}

function requireReady(session: ReturnType<typeof sessions.get>, res: Response): boolean {
  if (!session) return false;
  if (!session.isReady || !session.sock) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: `Client ${session.id} is not ready. Initialize and scan QR first.`,
    });
    return false;
  }
  return true;
}

// ─── Status ───────────────────────────────────────────────────────────────────

router.get('/:id', (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;

  if (session.isReady) {
    res.json({
      status: 'ready',
      clientId: session.id,
      phone: session.phone,
      name: session.name,
    });
  } else if (session.isInitialized) {
    res.json({ status: 'initializing', clientId: session.id });
  } else {
    res.json({
      status: 'inactive',
      clientId: session.id,
      hint: `POST /${session.id}/init to start`,
    });
  }
});

router.get('/:id/status', (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  res.json({
    id: session.id,
    isInitialized: session.isInitialized,
    isReady: session.isReady,
    disconnected: session.disconnected,
    phone: session.phone ?? null,
    name: session.name ?? null,
    qrData: session.qrData ?? null,
  });
});

// ─── Init / QR / Logout / Exit ────────────────────────────────────────────────

router.post('/:id/init', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  if (session.isInitialized) {
    res.json({ message: `Client ${session.id} is already initializing or ready` });
    return;
  }
  try {
    startSession(session.id).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${session.id}] Init error: ${msg}`);
    });
    res.json({ message: `Client ${session.id} is initializing…` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message });
  }
});

// Backward-compat GET init
router.get('/:id/init', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  if (session.isInitialized) {
    res.send('Client is already initializing or ready');
    return;
  }
  startSession(session.id).catch((err: unknown) =>
    console.error(`[${session.id}] Init error:`, err),
  );
  res.send(`Client ${session.id} is initializing…`);
});

router.get('/:id/qr', (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;

  if (session.isReady) {
    res.json({ message: 'Client is already authenticated' });
    return;
  }

  if (session.qrData) {
    const encoded = encodeURIComponent(session.qrData);
    res.send(`
      <!DOCTYPE html><html>
      <head>
        <title>QR — Client ${session.id} | WA Convo</title>
        <style>body{font-family:sans-serif;text-align:center;padding:2rem;background:#0d1117;color:#fff}
        h2{color:#25d366}p{color:#aaa}</style>
      </head>
      <body>
        <h2>WA Convo — Scan QR — Client ${session.id}</h2>
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}"
          alt="QR Code"
          width="300" height="300"
          style="border:4px solid #25d366;border-radius:8px"
        />
        <p>Page refreshes every 5 seconds</p>
        <script>setTimeout(()=>location.reload(),5000)</script>
      </body></html>
    `);
  } else {
    res.status(202).json({
      message: 'QR not generated yet',
      hint: session.isInitialized
        ? 'Client is initializing, refresh shortly'
        : `Initialize first: POST /${session.id}/init`,
    });
  }
});

router.post('/:id/logout', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  if (session.disconnected || !session.sock) {
    res.status(400).json({ error: 'Bad Request', message: 'Client is not connected' });
    return;
  }
  try {
    await logoutSession(session.id);
    res.json({ message: `Client ${session.id} logged out` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message });
  }
});

// Backward-compat GET logout
router.get('/:id/logout', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  if (session.disconnected || !session.sock) {
    res.send('Client is not logged in');
    return;
  }
  await logoutSession(session.id).catch(console.error);
  res.send('Client logged out');
});

router.post('/:id/exit', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  if (!session.isInitialized) {
    res.status(400).json({ error: 'Bad Request', message: 'Client is not initialized' });
    return;
  }
  try {
    await destroySession(session.id);
    res.json({ message: `Client ${session.id} stopped` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message });
  }
});

// Backward-compat GET exit
router.get('/:id/exit', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session) return;
  if (!session.isInitialized) {
    res.send('Client is not initialized');
    return;
  }
  await destroySession(session.id);
  res.send('Client exited');
});

// ─── Messaging ────────────────────────────────────────────────────────────────

router.post('/:id/send', validate(sendMessageSchema), async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const { number, message } = req.body as SendMessageBody;

  try {
    const messageId = await sendText(session.sock!, number, message);
    res.json({ success: true, messageId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.post('/:id/sendMedia', bodyLimit('50mb'), validate(sendMediaSchema), async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const { number, mediaUrl, caption } = req.body as SendMediaBody;

  try {
    const messageId = await sendMedia(session.sock!, number, mediaUrl, caption ?? '');
    res.json({ success: true, messageId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.post('/:id/sendBulk', validate(sendBulkSchema), async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const { numbers, message } = req.body as SendBulkBody;

  const results: BulkResult[] = [];
  for (const number of numbers) {
    try {
      const messageId = await sendText(session.sock!, number, message);
      results.push({ number, success: true, messageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ number, success: false, error: msg });
    }
  }

  const allOk = results.every((r) => r.success);
  res.status(allOk ? 200 : 207).json({ results });
});

router.post('/:id/sendButtons', validate(sendButtonsSchema), async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const { number, body, buttons, footer } = req.body as SendButtonsBody;

  try {
    const jid = toJid(number);
    const formattedText =
      `${body}\n\n` +
      buttons.map((b, i) => `${i + 1}. ${b.body}`).join('\n') +
      (footer ? `\n\n_${footer}_` : '');

    const result = await session.sock!.sendMessage(jid, { text: formattedText });
    res.json({
      success: true,
      messageId: result?.key.id ?? '',
      note: 'Buttons rendered as formatted text (WA native button messages are restricted by Meta).',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

// ─── Data Endpoints ───────────────────────────────────────────────────────────

router.get('/:id/contacts', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  try {
    const sock = session.sock!;
    // @ts-expect-error — store is attached at runtime when configured
    const store = sock.store as Record<string, unknown> | undefined;

    if (store?.contacts) {
      const contacts = Object.values(store.contacts as Record<string, { id: string; name?: string; notify?: string }>) as Array<{
        id: string;
        name?: string;
        notify?: string;
      }>;
      res.json(
        contacts.map((c) => ({
          id: c.id,
          name: c.name ?? c.notify ?? null,
          pushname: c.notify ?? null,
          number: c.id.split('@')[0] ?? '',
          isGroup: c.id.endsWith('@g.us'),
        })),
      );
    } else {
      const groups = await sock.groupFetchAllParticipating();
      const participants = new Map<string, { id: string }>();
      for (const g of Object.values(groups)) {
        for (const p of g.participants) {
          participants.set(p.id, p);
        }
      }
      res.json(
        [...participants.values()].map((p) => ({
          id: p.id,
          name: null,
          pushname: null,
          number: p.id.split('@')[0] ?? '',
          isGroup: false,
        })),
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.get('/:id/chats', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));

  try {
    const sock = session.sock!;
    // @ts-expect-error — store attached at runtime
    const store = sock.store as Record<string, unknown> | undefined;

    type ChatEntry = { id: string; name?: string; unreadCount?: number; conversationTimestamp?: number | bigint };
    let chats: ChatEntry[] = [];

    if (store?.chats) {
      chats = (Object.values(store.chats as Record<string, ChatEntry>) as ChatEntry[]);
    } else {
      const groups = await sock.groupFetchAllParticipating();
      chats = Object.values(groups).map((g) => ({
        id: g.id,
        name: g.subject,
        unreadCount: 0,
        conversationTimestamp: 0,
      }));
    }

    const total = chats.length;
    const start = (page - 1) * limit;
    const slice = chats.slice(start, start + limit).map((c) => ({
      id: c.id,
      name: c.name ?? null,
      isGroup: c.id.endsWith('@g.us'),
      unreadCount: c.unreadCount ?? 0,
      timestamp: typeof c.conversationTimestamp === 'bigint'
        ? Number(c.conversationTimestamp)
        : (c.conversationTimestamp ?? null),
      lastMessage: null,
    }));

    res.json({ total, page, limit, data: slice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

// Backward-compat
router.get('/:id/getChats', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;
  try {
    const groups = await session.sock!.groupFetchAllParticipating();
    res.json(Object.values(groups));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.get('/:id/chats/:chatId/messages', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const chatId = req.params.chatId as string;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));

  try {
    const sock = session.sock!;
    // @ts-expect-error — store attached at runtime
    const store = sock.store as Record<string, unknown> | undefined;

    type MessageEntry = {
      key: { id?: string; remoteJid?: string; fromMe?: boolean };
      message?: Record<string, unknown>;
      messageTimestamp?: number | bigint;
    };

    let msgs: MessageEntry[] = [];

    if (store?.messages) {
      const chatMessages = (store.messages as Record<string, { array?: MessageEntry[] }>)[chatId!];
      msgs = chatMessages?.array ?? [];
    }

    const total = msgs.length;
    const start = (page - 1) * limit;
    const slice = msgs.slice(start, start + limit).map((m) => ({
      id: m.key.id ?? null,
      body: (m.message?.['conversation'] as string | undefined) ??
            ((m.message?.['extendedTextMessage'] as { text?: string } | undefined)?.text) ??
            '',
      from: m.key.fromMe ? (session.phone ?? '') : (m.key.remoteJid ?? ''),
      to: m.key.fromMe ? (m.key.remoteJid ?? '') : (session.phone ?? ''),
      timestamp: typeof m.messageTimestamp === 'bigint'
        ? Number(m.messageTimestamp)
        : (m.messageTimestamp ?? null),
      type: m.message ? Object.keys(m.message)[0] ?? 'unknown' : 'unknown',
      hasMedia: !!(m.message?.['imageMessage'] ?? m.message?.['videoMessage'] ?? m.message?.['documentMessage']),
      isForwarded: false,
    }));

    res.json({ chatId, page, limit, total, data: slice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

// Backward-compat
router.get('/:id/getChatMessages/:chatId', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;
  try {
    const sock = session.sock!;
    // @ts-expect-error — store attached at runtime
    const store = sock.store as Record<string, unknown> | undefined;
    type MessageEntry = { key: unknown; message?: unknown };
    let msgs: MessageEntry[] = [];
    if (store?.messages) {
      const chatMessages = (store.messages as Record<string, { array?: MessageEntry[] }>)[(req.params.chatId as string)!];
      msgs = chatMessages?.array ?? [];
    }
    res.json(msgs.slice(0, 50));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

export default router;

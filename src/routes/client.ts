import { Router } from 'express';
import type { Request, Response } from 'express';
import { MessageMedia, Buttons } from 'whatsapp-web.js';
import { sessions, startSession, destroySession } from '../clientManager.js';
import type {
  SendMessageBody,
  SendMediaBody,
  SendBulkBody,
  SendButtonsBody,
  BulkResult,
} from '../types.js';

const router = Router();

// ─── Helper ────────────────────────────────────────────────────────────────

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
  if (!session.isReady) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: `Client ${session.id} is not ready. Initialize and scan QR first.`,
    });
    return false;
  }
  return true;
}

// ─── Status ─────────────────────────────────────────────────────────────────

router.get('/:id', (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session) return;

  if (session.isReady && session.client.info) {
    res.json({
      status: 'ready',
      clientId: session.id,
      phone: session.client.info.wid?.user,
      name: session.client.info.pushname,
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
  const session = getSessionOrError(req.params.id, res);
  if (!session) return;
  res.json({
    id: session.id,
    isInitialized: session.isInitialized,
    isReady: session.isReady,
    disconnected: session.disconnected,
    phone: session.isReady && session.client.info ? session.client.info.wid?.user ?? null : null,
    name: session.isReady && session.client.info ? session.client.info.pushname ?? null : null,
  });
});

// ─── Init / QR / Logout / Exit ───────────────────────────────────────────

router.post('/:id/init', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
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

// Keep GET /init for backward-compat
router.get('/:id/init', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
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
  const session = getSessionOrError(req.params.id, res);
  if (!session) return;

  if (session.isReady) {
    res.json({ message: 'Client is already authenticated' });
    return;
  }
  if (session.qrData) {
    res.send(`
      <!DOCTYPE html><html><head><title>QR - Client ${session.id}</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:2rem">
        <h2>Scan QR — Client ${session.id}</h2>
        <img src="${session.qrData}" alt="QR Code" />
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
  const session = getSessionOrError(req.params.id, res);
  if (!session) return;
  if (session.disconnected) {
    res.status(400).json({ error: 'Bad Request', message: 'Client is not connected' });
    return;
  }
  try {
    await session.client.logout();
    res.json({ message: `Client ${session.id} logged out` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message });
  }
});

// Keep GET /logout for backward-compat
router.get('/:id/logout', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session) return;
  if (session.disconnected) {
    res.send('Client is not logged in');
    return;
  }
  await session.client.logout();
  res.send('Client logged out');
});

router.post('/:id/exit', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
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

// Keep GET /exit for backward-compat
router.get('/:id/exit', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session) return;
  if (!session.isInitialized) {
    res.send('Client is not initialized');
    return;
  }
  await destroySession(session.id);
  res.send('Client exited');
});

// ─── Messaging ───────────────────────────────────────────────────────────────

router.post('/:id/send', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, message } = req.body as Partial<SendMessageBody>;
  if (!number || !message) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, message' });
    return;
  }

  try {
    const result = await session.client.sendMessage(number, message);
    res.json({ success: true, messageId: result.id._serialized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.post('/:id/sendMedia', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, mediaUrl, caption } = req.body as Partial<SendMediaBody>;
  if (!number || !mediaUrl) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, mediaUrl' });
    return;
  }

  try {
    const media = await MessageMedia.fromUrl(mediaUrl);
    const result = await session.client.sendMessage(number, media, { caption: caption ?? '' });
    res.json({ success: true, messageId: result.id._serialized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.post('/:id/sendBulk', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { numbers, message } = req.body as Partial<SendBulkBody>;
  if (!Array.isArray(numbers) || !numbers.length || !message) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: numbers (array), message' });
    return;
  }

  const results: BulkResult[] = [];
  for (const number of numbers) {
    try {
      const result = await session.client.sendMessage(number, message);
      results.push({ number, success: true, messageId: result.id._serialized });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ number, success: false, error: msg });
    }
  }

  const allOk = results.every((r) => r.success);
  res.status(allOk ? 200 : 207).json({ results });
});

router.post('/:id/sendButtons', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, body, buttons, title, footer } = req.body as Partial<SendButtonsBody>;
  if (!number || !body || !Array.isArray(buttons) || !buttons.length) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, body, buttons' });
    return;
  }

  try {
    const btns = new Buttons(body, buttons, title ?? '', footer ?? '');
    const result = await session.client.sendMessage(number, btns);
    res.json({ success: true, messageId: result.id._serialized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Buttons may not be supported in all WA versions
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

// ─── Data Endpoints ──────────────────────────────────────────────────────────

router.get('/:id/contacts', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const contacts = await session.client.getContacts();
    res.json(contacts.map((c) => ({ id: c.id._serialized, name: c.name, pushname: c.pushname, number: c.number, isGroup: c.isGroup, isMyContact: c.isMyContact })));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.get('/:id/chats', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));

  try {
    const chats = await session.client.getChats();
    const total = chats.length;
    const start = (page - 1) * limit;
    const slice = chats.slice(start, start + limit).map((c) => ({
      id: c.id._serialized,
      name: c.name,
      isGroup: c.isGroup,
      unreadCount: c.unreadCount,
      timestamp: c.timestamp,
      lastMessage: c.lastMessage?.body ?? null,
    }));
    res.json({ total, page, limit, data: slice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

// Keep old route for backward-compat
router.get('/:id/getChats', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;
  try {
    const chats = await session.client.getChats();
    res.json(chats);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

router.get('/:id/chats/:chatId/messages', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { chatId } = req.params;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));

  try {
    const chat = await session.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: limit * page });
    const slice = messages.slice((page - 1) * limit, page * limit).map((m) => ({
      id: m.id._serialized,
      body: m.body,
      from: m.from,
      to: m.to,
      timestamp: m.timestamp,
      type: m.type,
      hasMedia: m.hasMedia,
      isForwarded: m.isForwarded,
    }));
    res.json({ chatId, page, limit, data: slice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

// Keep old route for backward-compat
router.get('/:id/getChatMessages/:chatId', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;
  try {
    const chat = await session.client.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    res.json(messages);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message: msg });
  }
});

export default router;

import { Router } from 'express';
import type { Request, Response } from 'express';
import { toJid } from '../../core/client-manager.js';
import { getSessionOrError, requireReady } from '../../utils/session.js';

const router = Router();

// ─── POST /:id/chats/:jid/disappearing ───────────────────────────────────────

router.post('/:id/chats/:jid/disappearing', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const { expiration } = req.body as { expiration?: number };
  if (expiration == null) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: expiration (0 to disable)' });
    return;
  }

  try {
    const jid = toJid((req.params.jid as string)!);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await session.sock!.sendMessage(jid, {
      disappearingMessagesInChat: expiration === 0 ? false : expiration,
    } as any);
    res.json({ success: true, jid, expiration });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/chats/:jid/archive ────────────────────────────────────────────

router.post('/:id/chats/:jid/archive', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid((req.params.jid as string)!);
    await session.sock!.chatModify({ archive: true, lastMessages: [] }, jid);
    res.json({ success: true, jid, archived: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/chats/:jid/unarchive ──────────────────────────────────────────

router.post('/:id/chats/:jid/unarchive', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid((req.params.jid as string)!);
    await session.sock!.chatModify({ archive: false, lastMessages: [] }, jid);
    res.json({ success: true, jid, archived: false });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/chats/:jid/pin ─────────────────────────────────────────────────

router.post('/:id/chats/:jid/pin', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid((req.params.jid as string)!);
    await session.sock!.chatModify({ pin: true }, jid);
    res.json({ success: true, jid, pinned: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/chats/:jid/unpin ───────────────────────────────────────────────

router.post('/:id/chats/:jid/unpin', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid((req.params.jid as string)!);
    await session.sock!.chatModify({ pin: false }, jid);
    res.json({ success: true, jid, pinned: false });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/chats/:jid/mute ────────────────────────────────────────────────

router.post('/:id/chats/:jid/mute', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  const { duration } = req.body as { duration?: number };
  if (duration == null) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: duration (ms, or -1 for forever)' });
    return;
  }

  try {
    const jid = toJid((req.params.jid as string)!);
    const muteEndTime = duration === -1 ? null : Date.now() + duration;
    await session.sock!.chatModify({ mute: muteEndTime }, jid);
    res.json({ success: true, jid, muted: true, muteEndTime });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/chats/:jid/unmute ──────────────────────────────────────────────

router.post('/:id/chats/:jid/unmute', async (req: Request, res: Response) => {
  const session = getSessionOrError((req.params.id as string), res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid((req.params.jid as string)!);
    await session.sock!.chatModify({ mute: null }, jid);
    res.json({ success: true, jid, muted: false });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

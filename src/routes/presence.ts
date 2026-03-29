import { Router } from 'express';
import type { Request, Response } from 'express';
import { toJid } from '../clientManager.js';
import { getSessionOrError, requireReady } from '../utils/session.js';

const router = Router();

// Valid Baileys presence types
const VALID_PRESENCE = ['available', 'unavailable', 'composing', 'recording', 'paused'] as const;
type PresenceType = typeof VALID_PRESENCE[number];

// ─── POST /:id/presence/update ────────────────────────────────────────────────

router.post('/:id/presence/update', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { jid, presence } = req.body as { jid?: string; presence?: string };
  if (!presence) {
    res.status(400).json({
      error: 'Bad Request',
      message: `Missing required field: presence. Valid values: ${VALID_PRESENCE.join(', ')}`,
    });
    return;
  }

  if (!VALID_PRESENCE.includes(presence as PresenceType)) {
    res.status(400).json({
      error: 'Bad Request',
      message: `Invalid presence value. Must be one of: ${VALID_PRESENCE.join(', ')}`,
    });
    return;
  }

  try {
    const chatJid = jid ? toJid(jid) : undefined;
    await session.sock!.sendPresenceUpdate(presence as PresenceType, chatJid);
    res.json({ success: true, presence, jid: chatJid ?? 'global' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/presence/subscribe ────────────────────────────────────────────

router.post('/:id/presence/subscribe', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number } = req.body as { number?: string };
  if (!number) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: number' });
    return;
  }

  try {
    const jid = toJid(number);
    await session.sock!.presenceSubscribe(jid);
    res.json({ success: true, jid, subscribed: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

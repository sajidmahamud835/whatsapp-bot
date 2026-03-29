import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import { toJid } from '../../core/client-manager.js';
import { getSessionOrError, requireReady } from '../../utils/session.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveBuffer(urlOrBase64: string): Promise<Buffer> {
  if (urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://')) {
    const resp = await axios.get<ArrayBuffer>(urlOrBase64, {
      responseType: 'arraybuffer',
      timeout: 30_000,
    });
    return Buffer.from(resp.data);
  }
  const b64 = urlOrBase64.includes(',') ? urlOrBase64.split(',')[1]! : urlOrBase64;
  return Buffer.from(b64, 'base64');
}

// ─── POST /:id/messages/react ─────────────────────────────────────────────────

router.post('/:id/messages/react', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { key, emoji } = req.body as { key?: unknown; emoji?: string };
  if (!key || !emoji) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: key, emoji' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgKey = key as any;
    await session.sock!.sendMessage(msgKey.remoteJid as string, {
      react: { text: emoji, key: msgKey },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/poll ──────────────────────────────────────────────────

router.post('/:id/messages/poll', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, title, options, singleSelect } = req.body as {
    number?: string;
    title?: string;
    options?: string[];
    singleSelect?: boolean;
  };

  if (!number || !title || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, title, options (min 2)' });
    return;
  }

  try {
    const jid = toJid(number);
    const result = await session.sock!.sendMessage(jid, {
      poll: {
        name: title,
        values: options,
        selectableCount: singleSelect ? 1 : options.length,
      },
    });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/viewonce ──────────────────────────────────────────────

router.post('/:id/messages/viewonce', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, media, mediaType, caption, mimetype } = req.body as {
    number?: string;
    media?: string;
    mediaType?: 'image' | 'video';
    caption?: string;
    mimetype?: string;
  };

  if (!number || !media) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, media' });
    return;
  }

  const type = mediaType === 'video' ? 'video' : 'image';

  try {
    const jid = toJid(number);
    const buffer = await resolveBuffer(media);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await session.sock!.sendMessage(jid, {
      [type]: buffer,
      caption: caption ?? '',
      mimetype: mimetype ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'),
      viewOnce: true,
    } as any);
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/edit ──────────────────────────────────────────────────

router.post('/:id/messages/edit', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { key, newText } = req.body as { key?: unknown; newText?: string };
  if (!key || !newText) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: key, newText' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgKey = key as any;
    const result = await session.sock!.sendMessage(msgKey.remoteJid as string, {
      edit: msgKey,
      text: newText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/delete ────────────────────────────────────────────────

router.post('/:id/messages/delete', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { key } = req.body as { key?: unknown };
  if (!key) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: key' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgKey = key as any;
    await session.sock!.sendMessage(msgKey.remoteJid as string, { delete: msgKey });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/reply ─────────────────────────────────────────────────

router.post('/:id/messages/reply', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { key, text } = req.body as { key?: unknown; text?: string };
  if (!key || !text) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: key, text' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgKey = key as any;
    const result = await session.sock!.sendMessage(
      msgKey.remoteJid as string,
      { text },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { quoted: { key: msgKey, message: { conversation: text } } as any },
    );
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/forward ──────────────────────────────────────────────

router.post('/:id/messages/forward', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { key, to } = req.body as { key?: unknown; to?: string };
  if (!key || !to) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: key, to' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgKey = key as any;
    const jid = toJid(to);

    const result = await session.sock!.sendMessage(jid, {
      forward: { key: msgKey, message: {} },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/location ─────────────────────────────────────────────

router.post('/:id/messages/location', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, latitude, longitude, name } = req.body as {
    number?: string;
    latitude?: number;
    longitude?: number;
    name?: string;
  };

  if (!number || latitude == null || longitude == null) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, latitude, longitude' });
    return;
  }

  try {
    const jid = toJid(number);
    const result = await session.sock!.sendMessage(jid, {
      location: { degreesLatitude: latitude, degreesLongitude: longitude, name: name ?? '' },
    });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/contact ──────────────────────────────────────────────

router.post('/:id/messages/contact', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, name, contactNumber } = req.body as {
    number?: string;
    name?: string;
    contactNumber?: string;
  };

  if (!number || !name || !contactNumber) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, name, contactNumber' });
    return;
  }

  try {
    const jid = toJid(number);
    const cleanNumber = contactNumber.replace(/^\+/, '').replace(/\s/g, '');
    const vcard =
      `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;waid=${cleanNumber}:+${cleanNumber}\nEND:VCARD`;

    const result = await session.sock!.sendMessage(jid, {
      contacts: { displayName: name, contacts: [{ vcard }] },
    });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/sticker ──────────────────────────────────────────────

router.post('/:id/messages/sticker', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, sticker } = req.body as { number?: string; sticker?: string };
  if (!number || !sticker) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, sticker' });
    return;
  }

  try {
    const jid = toJid(number);
    const buffer = await resolveBuffer(sticker);
    const result = await session.sock!.sendMessage(jid, { sticker: buffer });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/voice ─────────────────────────────────────────────────

router.post('/:id/messages/voice', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number, audio, mimetype } = req.body as {
    number?: string;
    audio?: string;
    mimetype?: string;
  };

  if (!number || !audio) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: number, audio' });
    return;
  }

  try {
    const jid = toJid(number);
    const buffer = await resolveBuffer(audio);
    const result = await session.sock!.sendMessage(jid, {
      audio: buffer,
      mimetype: mimetype ?? 'audio/ogg; codecs=opus',
      ptt: true,
    });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/messages/read ──────────────────────────────────────────────────

router.post('/:id/messages/read', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { keys } = req.body as { keys?: unknown[] };
  if (!Array.isArray(keys) || keys.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: keys (array)' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await session.sock!.readMessages(keys as any);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

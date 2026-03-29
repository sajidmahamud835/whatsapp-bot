import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import { getSessionOrError, requireReady } from '../../utils/session.js';

const router = Router();

const STATUS_JID = 'status@broadcast';

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

// ─── POST /:id/status/text ────────────────────────────────────────────────────

router.post('/:id/status/text', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { text, backgroundColor, font } = req.body as {
    text?: string;
    backgroundColor?: string;
    font?: number;
  };

  if (!text) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: text' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await session.sock!.sendMessage(STATUS_JID, {
      text,
      backgroundArgb: backgroundColor ? parseInt(backgroundColor.replace('#', ''), 16) : 0xff1d1d1d,
      font: font ?? 0,
    } as any);
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/status/image ───────────────────────────────────────────────────

router.post('/:id/status/image', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { image, caption } = req.body as { image?: string; caption?: string };
  if (!image) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: image' });
    return;
  }

  try {
    const buffer = await resolveBuffer(image);
    const result = await session.sock!.sendMessage(STATUS_JID, {
      image: buffer,
      caption: caption ?? '',
    });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/status/video ───────────────────────────────────────────────────

router.post('/:id/status/video', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { video, caption } = req.body as { video?: string; caption?: string };
  if (!video) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: video' });
    return;
  }

  try {
    const buffer = await resolveBuffer(video);
    const result = await session.sock!.sendMessage(STATUS_JID, {
      video: buffer,
      caption: caption ?? '',
    });
    res.json({ success: true, messageId: result?.key.id ?? '' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

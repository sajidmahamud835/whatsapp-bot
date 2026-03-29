import { Router } from 'express';
import type { Request, Response } from 'express';
import { aiManager } from '../../core/ai/manager.js';
import { config } from '../../core/config.js';

const router = Router();

// ─── GET /ai/providers ────────────────────────────────────────────────────────

router.get('/ai/providers', (_req: Request, res: Response) => {
  const aiConfig = config.get<any>('ai');
  res.json({
    enabled: aiManager.isEnabled(),
    defaultProvider: aiConfig?.defaultProvider ?? '',
    providers: aiManager.getProviders(),
    systemPrompt: aiConfig?.systemPrompt ?? '',
    maxTokens: aiConfig?.maxTokens ?? 500,
    temperature: aiConfig?.temperature ?? 0.7,
  });
});

// ─── POST /ai/test ────────────────────────────────────────────────────────────

router.post('/ai/test', async (req: Request, res: Response) => {
  const { message, provider } = req.body as { message?: string; provider?: string };

  if (!message) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: message' });
    return;
  }

  if (!aiManager.isEnabled()) {
    res.status(400).json({ error: 'Bad Request', message: 'AI is not enabled. Set ai.enabled = true in config.' });
    return;
  }

  try {
    const response = await aiManager.chat('__test__', message, provider);
    res.json({ success: true, response });
  } catch (err: unknown) {
    res.status(500).json({
      error: 'AI Error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── PUT /ai/prompt ───────────────────────────────────────────────────────────

router.put('/ai/prompt', (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: string };

  if (typeof prompt !== 'string') {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: prompt (string)' });
    return;
  }

  aiManager.updateSystemPrompt(prompt);
  res.json({ success: true, prompt });
});

// ─── PUT /ai/config ───────────────────────────────────────────────────────────

router.put('/ai/config', (req: Request, res: Response) => {
  const { enabled, defaultProvider, maxTokens, temperature } = req.body as {
    enabled?: boolean;
    defaultProvider?: string;
    maxTokens?: number;
    temperature?: number;
  };

  if (enabled !== undefined) config.set('ai.enabled', enabled);
  if (defaultProvider !== undefined) config.set('ai.defaultProvider', defaultProvider);
  if (maxTokens !== undefined) config.set('ai.maxTokens', maxTokens);
  if (temperature !== undefined) config.set('ai.temperature', temperature);

  // Reload AI manager with new config
  aiManager.reload();

  res.json({ success: true, message: 'AI config updated' });
});

// ─── DELETE /ai/history/:jid ──────────────────────────────────────────────────

router.delete('/ai/history/:jid', (req: Request, res: Response) => {
  const jid = decodeURIComponent(req.params.jid ?? '');
  aiManager.clearHistory(jid);
  res.json({ success: true, message: `History cleared for ${jid}` });
});

export default router;

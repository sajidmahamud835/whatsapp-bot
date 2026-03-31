import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../../core/config.js';
import type { AppConfig } from '../../core/types.js';

const router = Router();

// ─── Sensitive fields to redact from GET /config ──────────────────────────────

const SENSITIVE_PATHS = ['server.apiKey', 'ai.providers'];

function redactConfig(cfg: AppConfig): AppConfig {
  const copy = structuredClone(cfg);
  // Redact API key
  if (copy.server?.apiKey) {
    copy.server.apiKey = copy.server.apiKey.length > 0 ? '***' : '';
  }
  // Redact AI provider API keys
  if (copy.ai?.providers) {
    for (const key of Object.keys(copy.ai.providers)) {
      const provider = copy.ai.providers[key];
      if (provider?.apiKey) {
        provider.apiKey = '***';
      }
    }
  }
  return copy;
}

// ─── GET /config — full config (redacted) ─────────────────────────────────────

router.get('/config', (_req: Request, res: Response) => {
  try {
    const full = config.getAll();
    res.json({ success: true, config: redactConfig(full) });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /config/:path — specific value (dot notation) ───────────────────────

router.get('/config/:path(*)', (req: Request, res: Response) => {
  const path = (req.params['path'] as string);
  if (!path) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing path parameter' });
    return;
  }

  // Block sensitive paths
  if (SENSITIVE_PATHS.some((s) => path.startsWith(s))) {
    res.status(403).json({ error: 'Forbidden', message: 'This config path is sensitive and cannot be read via API' });
    return;
  }

  try {
    const value = config.get(path);
    if (value === undefined) {
      res.status(404).json({ error: 'Not Found', message: `Config path '${path}' not found` });
      return;
    }
    res.json({ success: true, path, value });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── PUT /config/:path — set value ───────────────────────────────────────────

router.put('/config/:path(*)', (req: Request, res: Response) => {
  const path = (req.params['path'] as string);
  if (!path) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing path parameter' });
    return;
  }

  const { value } = req.body as { value?: unknown };
  if (value === undefined) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: value' });
    return;
  }

  try {
    config.set(path, value);
    res.json({ success: true, path, value });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /config/reload — reload from disk ───────────────────────────────────

router.post('/config/reload', (_req: Request, res: Response) => {
  try {
    config.reload();
    res.json({ success: true, message: 'Configuration reloaded from disk' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

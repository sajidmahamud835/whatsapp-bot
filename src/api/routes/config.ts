import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../../core/config.js';
import type { AppConfig } from '../../core/types.js';

const router = Router();

// ─── Sensitive fields to redact from GET /config ──────────────────────────────

/**
 * Recursively redact any keys matching *Key, *Secret, *Token patterns.
 */
function redactSensitiveFields(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      redactSensitiveFields(val);
    } else if (typeof val === 'string' && val.length > 0) {
      const lower = key.toLowerCase();
      if (lower.includes('key') || lower.includes('secret') || lower.includes('token') || lower.includes('password')) {
        obj[key] = val.length > 4 ? '***' + val.slice(-4) : '***';
      }
    }
  }
}

function redactConfig(cfg: AppConfig): AppConfig {
  const copy = structuredClone(cfg);
  redactSensitiveFields(copy as unknown as Record<string, any>);
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
  const SENSITIVE_PATHS = ['server.apiKey', 'ai.providers', 'integrations.meta'];
  if (SENSITIVE_PATHS.some(s => path.startsWith(s))) {
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

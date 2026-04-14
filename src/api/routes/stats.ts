import { Router } from 'express';
import type { Request, Response } from 'express';
import { getStats } from '../../core/stats.js';

const router = Router();

// ─── GET /stats — server metrics ─────────────────────────────────────────────

router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;

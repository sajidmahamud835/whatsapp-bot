import { Router } from 'express';
import type { Request, Response } from 'express';
import { cronManager } from '../../core/cron/manager.js';
import { validate } from '../middleware/validate.js';
import { createCronSchema, updateCronSchema } from '../schemas/cron.js';

const router = Router();

// ─── GET /cron — list jobs ────────────────────────────────────────────────────

router.get('/cron', (_req: Request, res: Response) => {
  const jobs = cronManager.listJobs();
  res.json({ jobs, total: jobs.length });
});

// ─── POST /cron — create job ──────────────────────────────────────────────────

router.post('/cron', validate(createCronSchema), async (req: Request, res: Response) => {
  const { name, schedule, clientId, action, params, enabled } = req.body as {
    name: string;
    schedule: string;
    clientId: string;
    action: string;
    params: Record<string, unknown>;
    enabled: boolean;
  };

  try {
    const job = await cronManager.addJob({ name, schedule, clientId, action, params, enabled });
    res.status(201).json({ success: true, job });
  } catch (err: unknown) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── PUT /cron/:id — update job ───────────────────────────────────────────────

router.put('/cron/:id', validate(updateCronSchema), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const job = await cronManager.updateJob(id!, req.body);
    res.json({ success: true, job });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: msg });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── DELETE /cron/:id — delete job ───────────────────────────────────────────

router.delete('/cron/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    cronManager.deleteJob(id!);
    res.json({ success: true, message: `Cron job ${id} deleted` });
  } catch (err: unknown) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── POST /cron/:id/run — run job now ────────────────────────────────────────

router.post('/cron/:id/run', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    await cronManager.runJobNow(id!);
    res.json({ success: true, message: `Cron job ${id} executed` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: msg });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

export default router;

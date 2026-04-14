import { Router } from 'express';
import type { Request, Response } from 'express';
import { flowService, executeFlow } from '../services/flow-engine.js';

const router = Router();

// ─── GET /pro/flows — list all flows ─────────────────────────────────────────

router.get('/pro/flows', (_req: Request, res: Response) => {
  const flows = flowService.list();
  res.json({ flows, total: flows.length });
});

// ─── POST /pro/flows — create flow ──────────────────────────────────────────

router.post('/pro/flows', (req: Request, res: Response) => {
  const { name, description, client_id, trigger_type, trigger_config, nodes, edges } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const flow = flowService.create({ name, description, client_id, trigger_type, trigger_config, nodes, edges });
  res.status(201).json({ success: true, flow });
});

// ─── GET /pro/flows/:id — get flow ──────────────────────────────────────────

router.get('/pro/flows/:id', (req: Request, res: Response) => {
  const flow = flowService.get(String(req.params.id));
  if (!flow) { res.status(404).json({ error: 'Flow not found' }); return; }
  res.json({ flow });
});

// ─── PUT /pro/flows/:id — update flow (nodes, edges, config) ────────────────

router.put('/pro/flows/:id', (req: Request, res: Response) => {
  try {
    const flow = flowService.update(String(req.params.id), req.body);
    res.json({ success: true, flow });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── PUT /pro/flows/:id/toggle — enable/disable ─────────────────────────────

router.put('/pro/flows/:id/toggle', (req: Request, res: Response) => {
  const flow = flowService.get(String(req.params.id));
  if (!flow) { res.status(404).json({ error: 'Flow not found' }); return; }
  const updated = flowService.update(flow.id, { enabled: !flow.enabled });
  res.json({ success: true, flow: updated });
});

// ─── POST /pro/flows/:id/test — test execute with a fake message ────────────

router.post('/pro/flows/:id/test', async (req: Request, res: Response) => {
  const flow = flowService.get(String(req.params.id));
  if (!flow) { res.status(404).json({ error: 'Flow not found' }); return; }
  const { message, jid, clientId } = req.body as { message?: string; jid?: string; clientId?: string };
  try {
    await executeFlow(flow, clientId || flow.client_id, jid || 'test@s.whatsapp.net', message || 'test');
    res.json({ success: true, message: 'Flow executed' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Execution failed' });
  }
});

// ─── POST /pro/flows/:id/duplicate — clone a flow ──────────────────────────

router.post('/pro/flows/:id/duplicate', (req: Request, res: Response) => {
  try {
    const flow = flowService.duplicate(String(req.params.id));
    res.json({ success: true, flow });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /pro/flows/:id/executions — execution log ──────────────────────────

router.get('/pro/flows/:id/executions', (req: Request, res: Response) => {
  const limit = parseInt(req.query['limit'] as string) || 50;
  const executions = flowService.getExecutions(String(req.params.id), limit);
  res.json({ executions, total: executions.length });
});

// ─── DELETE /pro/flows/:id ───────────────────────────────────────────────────

router.delete('/pro/flows/:id', (req: Request, res: Response) => {
  flowService.delete(String(req.params.id));
  res.json({ success: true });
});

export default router;

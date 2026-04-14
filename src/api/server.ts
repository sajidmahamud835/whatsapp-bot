import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../core/config.js';
import { getLogger } from '../core/logger.js';
import { eventBus } from '../core/events.js';
import { apiKeyAuth } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { setupWebSocket } from './websocket.js';
import { initializeSessions } from '../core/client-manager.js';

// ─── Routes ───────────────────────────────────────────────────────────────────
import healthRouter from './routes/health.js';
import clientRouter from './routes/client.js';
import messagesRouter from './routes/messages.js';
import groupsRouter from './routes/groups.js';
import contactsRouter from './routes/contacts.js';
import statusRouter from './routes/status.js';
import presenceRouter from './routes/presence.js';
import privacyRouter from './routes/privacy.js';
import configRouter from './routes/config.js';
import webhookRouter from './routes/webhook.js';
import aiRouter from './routes/ai.js';
import cronRouter from './routes/cron.js';
import webhooksRouter from './routes/webhooks.js';
import statsRouter from './routes/stats.js';

// ─── Pro Routes (contacts, templates, campaigns, analytics, flows) ──────────
import contactManagerRouter from '../pro/routes/contacts-manager.js';
import campaignsRouter from '../pro/routes/campaigns.js';
import templatesRouter from '../pro/routes/templates.js';
import analyticsRouter from '../pro/routes/analytics.js';
import flowsRouter from '../pro/routes/flows.js';
import { findMatchingFlows, executeFlow } from '../pro/services/flow-engine.js';
import { getProDatabase } from '../pro/db/pro-database.js';

// ─── Managers ─────────────────────────────────────────────────────────────────
import { cronManager } from '../core/cron/manager.js';
import { webhookManager } from '../core/webhooks/manager.js';

// ─── Database ────────────────────────────────────────────────────────────────
import { getDatabase, closeDatabase } from '../core/db/database.js';
import { messageStore } from '../core/db/message-store.js';
import { aiHistoryStore } from '../core/db/ai-history-store.js';
import { webhookLogStore } from '../core/db/webhook-log-store.js';
import { cronLogStore } from '../core/db/cron-log-store.js';

// ─── Initialize config & logger first ────────────────────────────────────────
config.load();
const log = getLogger();

const app = express();

// Create HTTP or HTTPS server based on SSL config
const sslConfig = config.get<{ enabled: boolean; certPath?: string; keyPath?: string }>('deployment.ssl');
let httpServer: ReturnType<typeof createServer>;
if (sslConfig?.enabled && sslConfig.certPath && sslConfig.keyPath) {
  const https = await import('https');
  httpServer = https.createServer(
    { cert: readFileSync(sslConfig.certPath), key: readFileSync(sslConfig.keyPath) },
    app,
  );
  log.info('SSL enabled');
} else {
  httpServer = createServer(app);
}

const serverCfg = config.get<{ port: number; host: string }>('server');
const port = serverCfg?.port ?? parseInt(process.env['PORT'] ?? '3000', 10);
const host = serverCfg?.host ?? process.env['HOST'] ?? '0.0.0.0';

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for QR page inline scripts
app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(rateLimiter);

// ─── Dashboard Static Files ──────────────────────────────────────────────────

const __serverDirname = dirname(fileURLToPath(import.meta.url));
const dashboardDistPath = resolve(__serverDirname, '..', '..', 'dashboard', 'dist');
if (existsSync(dashboardDistPath)) {
  app.use('/dashboard', express.static(dashboardDistPath));
  app.get('/dashboard/*', (_req, res) => {
    res.sendFile(resolve(dashboardDistPath, 'index.html'));
  });
}

// ─── Public Routes ────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name: 'WA Convo',
    description: 'WhatsApp Automation Platform',
    version: '4.2.0',
    engine: 'Baileys + Official Cloud API',
    docs: 'https://github.com/sajidmahamud835/whatsapp-bot',
    websocket: `ws://${host}:${port}/ws`,
  });
});

// Webhook route is public (no auth — Meta won't send auth headers)
app.use(webhookRouter);

// ─── Protected Routes ─────────────────────────────────────────────────────────

app.use(apiKeyAuth);

// Named routes first (before /:id catch-all in clientRouter)
app.use(healthRouter);
app.use(configRouter);
app.use(aiRouter);
app.use(cronRouter);
app.use(webhooksRouter);
app.use(statsRouter);

// Pro feature routes
app.use(contactManagerRouter);
app.use(campaignsRouter);
app.use(templatesRouter);
app.use(analyticsRouter);
app.use(flowsRouter);

// Client routes (/:id param) must come after named routes
app.use(clientRouter);
app.use(messagesRouter);
app.use(groupsRouter);
app.use(contactsRouter);
app.use(statusRouter);
app.use(presenceRouter);
app.use(privacyRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint does not exist' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  log.error({ err }, 'Express error');
  res.status(500).json({ error: 'Internal Server Error', message });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // Initialize databases

  getDatabase();
  getProDatabase(); // Initialize pro tables (contacts, templates, campaigns, flows)
  log.info('Database initialized');

  // Schedule daily retention purge
  const retentionDays = config.get<number>('database.retentionDays') ?? 30;
  setInterval(() => {
    try {
      const msgPurged = messageStore.purge(retentionDays);
      const aiPurged = aiHistoryStore.purge(retentionDays);
      const whPurged = webhookLogStore.purge(retentionDays);
      const cronPurged = cronLogStore.purge(retentionDays);
      if (msgPurged + aiPurged + whPurged + cronPurged > 0) {
        log.info('Retention purge: %d messages, %d AI history, %d webhook logs, %d cron logs removed', msgPurged, aiPurged, whPurged, cronPurged);
      }
    } catch (err) {
      log.error({ err }, 'Retention purge error');
    }
  }, 24 * 60 * 60 * 1000); // Run daily

  // Initialize WhatsApp client sessions (also initializes AI manager)
  initializeSessions();

  // Initialize cron manager
  await cronManager.initialize();

  // Initialize webhook manager
  webhookManager.initialize();

  // Hook flow engine into message events
  eventBus.on('message.received', async (event) => {
    try {
      const flows = findMatchingFlows(event.clientId, event.from, event.body);
      for (const flow of flows) {
        await executeFlow(flow, event.clientId, event.from, event.body);
      }
    } catch (err) {
      log.error({ err }, 'Flow execution error');
    }
  });

  // Setup WebSocket
  setupWebSocket(httpServer);

  // Start HTTP server
  httpServer.listen(port, host, () => {
    log.info({ port, host }, '🚀 WA Convo v4.2.0 started');
    log.info('   Health:    http://%s:%d/health', host, port);
    log.info('   Clients:   http://%s:%d/clients', host, port);
    log.info('   WebSocket: ws://%s:%d/ws', host, port);
    log.info('   Config:    http://%s:%d/config', host, port);
    log.info('   AI:        http://%s:%d/ai/providers', host, port);
    log.info('   Cron:      http://%s:%d/cron', host, port);
    log.info('   Webhooks:  http://%s:%d/webhooks', host, port);
    log.info('   Stats:     http://%s:%d/stats', host, port);
    log.info('   Meta WH:   http://%s:%d/webhook/whatsapp', host, port);

    // Also log to console for visibility
    console.log(`\n🟢 WA Convo v4.2.0 — WhatsApp Automation Platform`);
    console.log(`   API:       http://${host}:${port}/`);
    console.log(`   Health:    http://${host}:${port}/health`);
    console.log(`   Clients:   http://${host}:${port}/clients`);
    console.log(`   WebSocket: ws://${host}:${port}/ws`);
    console.log(`   Config:    http://${host}:${port}/config`);
    console.log(`   AI:        http://${host}:${port}/ai/providers`);
    console.log(`   Cron:      http://${host}:${port}/cron`);
    console.log(`   Webhooks:  http://${host}:${port}/webhooks`);
    console.log(`   Stats:     http://${host}:${port}/stats`);
    console.log(`   Meta WH:   http://${host}:${port}/webhook/whatsapp\n`);

    eventBus.emit('server.started', { port, host });
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received — shutting down');
  eventBus.emit('server.stopped', {});
  cronManager.stopAll();
  closeDatabase();
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  log.info('SIGINT received — shutting down');
  eventBus.emit('server.stopped', {});
  cronManager.stopAll();
  closeDatabase();
  httpServer.close(() => process.exit(0));
});

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;

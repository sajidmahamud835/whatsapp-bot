import { sessions } from './client-manager.js';
import { messageStore } from './db/message-store.js';
import { aiHistoryStore } from './db/ai-history-store.js';
import { webhookLogStore } from './db/webhook-log-store.js';
import { cronLogStore } from './db/cron-log-store.js';
import { cronManager } from './cron/manager.js';
import { webhookManager } from './webhooks/manager.js';
import { aiManager } from './ai/manager.js';
const startTime = Date.now();

export interface ServerStats {
  uptime: number;
  uptimeFormatted: string;
  memory: NodeJS.MemoryUsage;
  clients: {
    total: number;
    ready: number;
    disconnected: number;
    initialized: number;
  };
  messages: {
    received24h: number;
    sent24h: number;
    totalStored: number;
  };
  ai: {
    enabled: boolean;
    providers: string[];
    totalConversations: number;
  };
  cron: {
    totalJobs: number;
    activeJobs: number;
    executionsToday: number;
  };
  webhooks: {
    registered: number;
    deliveries24h: number;
  };
}

// Cache stats for 5 seconds to avoid hammering SQLite
let cachedStats: ServerStats | null = null;
let cachedAt = 0;
const CACHE_TTL = 5000;

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export function getStats(): ServerStats {
  const now = Date.now();

  if (cachedStats && (now - cachedAt) < CACHE_TTL) {
    return cachedStats;
  }

  const uptimeMs = now - startTime;
  const oneDayAgo = Math.floor((now - 86400_000) / 1000);

  // Client stats
  let total = 0, ready = 0, disconnected = 0, initialized = 0;
  for (const session of sessions.values()) {
    total++;
    if (session.isReady) ready++;
    if (session.disconnected) disconnected++;
    if (session.isInitialized) initialized++;
  }

  // Cron stats
  const cronJobs = cronManager.listJobs();

  const stats: ServerStats = {
    uptime: uptimeMs,
    uptimeFormatted: formatUptime(uptimeMs),
    memory: process.memoryUsage(),
    clients: { total, ready, disconnected, initialized },
    messages: {
      received24h: messageStore.countReceivedSince(oneDayAgo),
      sent24h: messageStore.countSentSince(oneDayAgo),
      totalStored: messageStore.totalCount(),
    },
    ai: {
      enabled: aiManager.isEnabled(),
      providers: aiManager.getProviders(),
      totalConversations: aiHistoryStore.conversationCount(),
    },
    cron: {
      totalJobs: cronJobs.length,
      activeJobs: cronJobs.filter(j => j.isRunning).length,
      executionsToday: cronLogStore.countTodayExecutions(),
    },
    webhooks: {
      registered: webhookManager.list().length,
      deliveries24h: webhookLogStore.countSince(oneDayAgo),
    },
  };

  cachedStats = stats;
  cachedAt = now;
  return stats;
}

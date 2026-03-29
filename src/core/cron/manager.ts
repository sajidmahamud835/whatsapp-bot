import type { CronJobConfig } from '../types.js';
import { config } from '../config.js';
import { childLogger } from '../logger.js';
import { sessions } from '../client-manager.js';
import { randomUUID } from 'crypto';

const log = childLogger('cron-manager');

// Lazily loaded node-cron
let nodeCron: any = null;

async function getCron(): Promise<any> {
  if (!nodeCron) {
    try {
      nodeCron = (await import('node-cron')).default ?? (await import('node-cron'));
    } catch {
      throw new Error('node-cron is not installed. Run: npm install node-cron');
    }
  }
  return nodeCron;
}

interface CronTask {
  config: CronJobConfig;
  task: any; // node-cron task
  lastRun?: Date;
  lastError?: string;
  runCount: number;
}

class CronManager {
  private tasks = new Map<string, CronTask>();
  private _initialized = false;

  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    await this._loadJobs();
  }

  private async _loadJobs(): Promise<void> {
    const crons = config.get<CronJobConfig[]>('crons') ?? [];
    for (const cronConfig of crons) {
      if (cronConfig.enabled) {
        await this._startJob(cronConfig);
      }
    }
    log.info('Cron manager initialized with %d jobs', this.tasks.size);
  }

  private async _startJob(cronConfig: CronJobConfig): Promise<void> {
    const cron = await getCron();

    if (!cron.validate(cronConfig.schedule)) {
      log.warn({ jobId: cronConfig.id }, 'Invalid cron schedule: %s', cronConfig.schedule);
      return;
    }

    const task = cron.schedule(cronConfig.schedule, async () => {
      await this._runJobAction(cronConfig);
    }, { scheduled: true });

    const existing = this.tasks.get(cronConfig.id);
    if (existing?.task) {
      existing.task.stop();
    }

    this.tasks.set(cronConfig.id, {
      config: cronConfig,
      task,
      runCount: 0,
    });

    log.info({ jobId: cronConfig.id }, 'Cron job started: %s (%s)', cronConfig.name, cronConfig.schedule);
  }

  private async _runJobAction(cronConfig: CronJobConfig): Promise<void> {
    const taskEntry = this.tasks.get(cronConfig.id);
    if (taskEntry) {
      taskEntry.lastRun = new Date();
      taskEntry.runCount++;
    }

    log.info({ jobId: cronConfig.id }, 'Running cron job: %s', cronConfig.name);

    const session = sessions.get(cronConfig.clientId);

    try {
      switch (cronConfig.action) {
        case 'sendMessage': {
          const { to, message } = cronConfig.params as { to: string; message: string };
          if (!session?.sock) throw new Error(`Session ${cronConfig.clientId} not connected`);
          await session.sock.sendMessage(to, { text: message });
          log.info({ jobId: cronConfig.id }, 'Sent message to %s', to);
          break;
        }

        case 'broadcast': {
          const { numbers, message } = cronConfig.params as { numbers: string[]; message: string };
          if (!session?.sock) throw new Error(`Session ${cronConfig.clientId} not connected`);
          const results = [];
          for (const number of (numbers ?? [])) {
            const jid = number.includes('@') ? number : `${number.replace(/^\+/, '')}@s.whatsapp.net`;
            try {
              await session.sock.sendMessage(jid, { text: message });
              results.push({ number, success: true });
            } catch (err) {
              results.push({ number, success: false, error: err instanceof Error ? err.message : String(err) });
            }
          }
          log.info({ jobId: cronConfig.id }, 'Broadcast complete: %d/%d success', results.filter(r => r.success).length, results.length);
          break;
        }

        case 'postStatus': {
          const { text } = cronConfig.params as { text: string };
          if (!session?.sock) throw new Error(`Session ${cronConfig.clientId} not connected`);
          // WhatsApp status/story
          await (session.sock as any).sendMessage('status@broadcast', { text });
          log.info({ jobId: cronConfig.id }, 'Posted status update');
          break;
        }

        default:
          log.warn({ jobId: cronConfig.id }, 'Unknown cron action: %s', cronConfig.action);
      }

      if (taskEntry) taskEntry.lastError = undefined;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error({ jobId: cronConfig.id }, 'Cron job error: %s', errMsg);
      if (taskEntry) taskEntry.lastError = errMsg;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async addJob(jobConfig: Partial<CronJobConfig> & { name: string; schedule: string; clientId: string; action: string }): Promise<CronJobConfig> {
    const newJob: CronJobConfig = {
      id: jobConfig.id ?? randomUUID(),
      name: jobConfig.name,
      schedule: jobConfig.schedule,
      clientId: jobConfig.clientId,
      action: jobConfig.action,
      params: jobConfig.params ?? {},
      enabled: jobConfig.enabled ?? true,
    };

    // Save to config
    const crons = config.get<CronJobConfig[]>('crons') ?? [];
    crons.push(newJob);
    config.set('crons', crons);

    if (newJob.enabled) {
      await this._startJob(newJob);
    } else {
      this.tasks.set(newJob.id, { config: newJob, task: null, runCount: 0 });
    }

    return newJob;
  }

  async updateJob(id: string, updates: Partial<CronJobConfig>): Promise<CronJobConfig> {
    const crons = config.get<CronJobConfig[]>('crons') ?? [];
    const idx = crons.findIndex(c => c.id === id);
    if (idx === -1) throw new Error(`Cron job ${id} not found`);

    const updated = { ...crons[idx]!, ...updates, id };
    crons[idx] = updated;
    config.set('crons', crons);

    // Stop existing task
    const existing = this.tasks.get(id);
    if (existing?.task) existing.task.stop();

    if (updated.enabled) {
      await this._startJob(updated);
    } else {
      this.tasks.set(id, { config: updated, task: null, runCount: existing?.runCount ?? 0 });
    }

    return updated;
  }

  deleteJob(id: string): void {
    const crons = config.get<CronJobConfig[]>('crons') ?? [];
    const filtered = crons.filter(c => c.id !== id);
    config.set('crons', filtered);

    const existing = this.tasks.get(id);
    if (existing?.task) existing.task.stop();
    this.tasks.delete(id);
  }

  async runJobNow(id: string): Promise<void> {
    const crons = config.get<CronJobConfig[]>('crons') ?? [];
    const jobConfig = crons.find(c => c.id === id);
    if (!jobConfig) throw new Error(`Cron job ${id} not found`);
    await this._runJobAction(jobConfig);
  }

  listJobs(): Array<CronJobConfig & { lastRun?: string; lastError?: string; runCount: number; isRunning: boolean }> {
    const crons = config.get<CronJobConfig[]>('crons') ?? [];
    return crons.map(c => {
      const task = this.tasks.get(c.id);
      return {
        ...c,
        lastRun: task?.lastRun?.toISOString(),
        lastError: task?.lastError,
        runCount: task?.runCount ?? 0,
        isRunning: !!(task?.task),
      };
    });
  }

  stopAll(): void {
    for (const [, task] of this.tasks) {
      if (task.task) task.task.stop();
    }
    this.tasks.clear();
  }
}

export const cronManager = new CronManager();

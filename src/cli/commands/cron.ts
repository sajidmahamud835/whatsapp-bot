import chalk from 'chalk';
import * as readline from 'readline';
import { apiRequest, printTable } from '../utils.js';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  clientId: string;
  action: string;
  enabled: boolean;
  lastRun?: string;
  lastError?: string;
  runCount: number;
  isRunning: boolean;
}

export async function cronListCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ jobs: CronJob[]; total: number }>('/cron');

    if (data.jobs.length === 0) {
      console.log(chalk.yellow('\n⚠ No cron jobs configured.\n'));
      console.log(chalk.gray('Create one with: wa-convo cron add'));
      return;
    }

    console.log(chalk.cyan(`\n⏰ Cron Jobs (${data.total})\n`));

    const rows = data.jobs.map(j => [
      j.id.slice(0, 8),
      j.name,
      j.schedule,
      j.clientId,
      j.action,
      j.enabled ? (j.isRunning ? chalk.green('running') : chalk.yellow('enabled')) : chalk.red('disabled'),
      j.lastRun ? new Date(j.lastRun).toLocaleTimeString() : '-',
      String(j.runCount),
      j.lastError ? chalk.red('ERR') : chalk.green('OK'),
    ]);

    printTable(['ID', 'Name', 'Schedule', 'Client', 'Action', 'Status', 'Last Run', 'Runs', 'Health'], rows);
    console.log();
  } catch (err: unknown) {
    console.error(chalk.red('✗ Failed:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function cronRunCommand(id: string): Promise<void> {
  try {
    console.log(chalk.gray(`Running cron job ${id}...`));
    await apiRequest<any>(`/cron/${id}/run`, 'POST');
    console.log(chalk.green(`✓ Cron job ${id} executed`));
  } catch (err: unknown) {
    console.error(chalk.red('✗ Failed:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function cronDeleteCommand(id: string): Promise<void> {
  try {
    await apiRequest<any>(`/cron/${id}`, 'DELETE');
    console.log(chalk.green(`✓ Cron job ${id} deleted`));
  } catch (err: unknown) {
    console.error(chalk.red('✗ Failed:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function cronAddCommand(opts: {
  name?: string;
  schedule?: string;
  clientId?: string;
  action?: string;
  params?: string;
}): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

  try {
    console.log(chalk.cyan('\n⏰ Add Cron Job\n'));

    const name = opts.name ?? await ask(chalk.gray('Job name: '));
    const schedule = opts.schedule ?? await ask(chalk.gray('Cron schedule (e.g. "0 9 * * *"): '));
    const clientId = opts.clientId ?? await ask(chalk.gray('Client ID (e.g. "1"): '));
    const action = opts.action ?? await ask(chalk.gray('Action (sendMessage|broadcast|postStatus): '));

    let params: Record<string, unknown> = {};
    if (opts.params) {
      try {
        params = JSON.parse(opts.params);
      } catch {
        console.warn(chalk.yellow('Warning: Could not parse --params JSON, using empty params'));
      }
    } else {
      // Interactive params
      if (action === 'sendMessage') {
        const to = await ask(chalk.gray('Recipient JID or number: '));
        const message = await ask(chalk.gray('Message: '));
        params = { to, message };
      } else if (action === 'broadcast') {
        const numbersStr = await ask(chalk.gray('Numbers (comma-separated): '));
        const message = await ask(chalk.gray('Message: '));
        params = { numbers: numbersStr.split(',').map(s => s.trim()), message };
      } else if (action === 'postStatus') {
        const text = await ask(chalk.gray('Status text: '));
        params = { text };
      }
    }

    rl.close();

    const job = await apiRequest<{ job: CronJob }>('/cron', 'POST', {
      name,
      schedule,
      clientId,
      action,
      params,
      enabled: true,
    });

    console.log(chalk.green(`\n✓ Cron job created: ${job.job.id}\n`));
    console.log(chalk.gray(`  Name:     ${job.job.name}`));
    console.log(chalk.gray(`  Schedule: ${job.job.schedule}`));
    console.log(chalk.gray(`  Action:   ${job.job.action}\n`));
  } catch (err: unknown) {
    rl.close();
    console.error(chalk.red('✗ Failed:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

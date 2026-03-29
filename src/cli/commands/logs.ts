import { createReadStream, existsSync, statSync, watchFile } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { config } from '../../core/config.js';
import { error, color, info } from '../utils.js';

export interface LogsOptions {
  level?: string;
  since?: string;
  follow?: boolean;
  lines?: string;
}

const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const LEVEL_COLORS: Record<string, (s: string) => string> = {
  trace: color.dim,
  debug: color.dim,
  info: color.cyan,
  warn: color.yellow,
  error: color.red,
  fatal: color.red,
};

function parseSince(since: string): number {
  const match = since.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  const num = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Date.now() - num * (multipliers[unit] ?? 1000);
}

function formatLogLine(line: string, levelFilter?: string, sinceMs?: number): string | null {
  try {
    const entry = JSON.parse(line) as {
      time?: string;
      level?: string;
      msg?: string;
      component?: string;
      clientId?: string;
      [key: string]: unknown;
    };

    const level = entry.level ?? 'info';
    const levelIndex = LEVELS.indexOf(level);
    const filterIndex = LEVELS.indexOf(levelFilter ?? 'info');

    if (levelIndex < filterIndex) return null;

    if (sinceMs && entry.time) {
      const entryTime = new Date(entry.time).getTime();
      if (entryTime < sinceMs) return null;
    }

    const timestamp = entry.time ? new Date(entry.time).toLocaleTimeString() : '';
    const levelStr = level.toUpperCase().padEnd(5);
    const colorFn = LEVEL_COLORS[level] ?? color.dim;
    const component = entry.component ? `[${entry.component}] ` : '';
    const clientId = entry.clientId ? `{${entry.clientId}} ` : '';

    return `${color.dim(timestamp)} ${colorFn(levelStr)} ${component}${clientId}${entry.msg ?? ''}`;
  } catch {
    // Not JSON — return raw
    return line;
  }
}

export async function logsCommand(options: LogsOptions): Promise<void> {
  config.load();
  const logDir = resolve(config.get<string>('logging.dir') ?? './logs');
  const logFile = `${logDir}/wa-convo.log`;

  if (!existsSync(logFile)) {
    error(`Log file not found: ${logFile}`);
    info('Make sure the server has been started');
    process.exit(1);
  }

  const levelFilter = options.level ?? 'info';
  const sinceMs = options.since ? parseSince(options.since) : undefined;
  const tailLines = parseInt(options.lines ?? '50', 10);

  // Read existing lines
  const lines: string[] = [];
  const rl = createInterface({ input: createReadStream(logFile) });

  await new Promise<void>((resolve) => {
    rl.on('line', (line) => {
      if (line.trim()) lines.push(line);
    });
    rl.on('close', resolve);
  });

  // Show last N lines
  const recentLines = lines.slice(-tailLines);
  for (const line of recentLines) {
    const formatted = formatLogLine(line, levelFilter, sinceMs);
    if (formatted !== null) {
      console.log(formatted);
    }
  }

  if (!options.follow) return;

  // Follow mode — watch for new lines
  info('Following log... (Ctrl+C to stop)');
  let lastSize = statSync(logFile).size;

  watchFile(logFile, { interval: 500 }, () => {
    const currentSize = statSync(logFile).size;
    if (currentSize <= lastSize) {
      lastSize = currentSize;
      return;
    }

    const stream = createReadStream(logFile, { start: lastSize });
    lastSize = currentSize;

    const rl2 = createInterface({ input: stream });
    rl2.on('line', (line) => {
      if (!line.trim()) return;
      const formatted = formatLogLine(line, levelFilter);
      if (formatted !== null) {
        console.log(formatted);
      }
    });
  });

  // Keep process alive
  await new Promise(() => {
    process.on('SIGINT', () => {
      process.exit(0);
    });
  });
}

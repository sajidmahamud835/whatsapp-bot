import { config } from '../core/config.js';

// ─── API client helpers ───────────────────────────────────────────────────────

export function getApiBase(): string {
  const serverCfg = config.get<{ port: number; host: string }>('server');
  const port = serverCfg?.port ?? 3000;
  const host = serverCfg?.host ?? '127.0.0.1';
  return `http://${host}:${port}`;
}

export function getApiKey(): string {
  return config.get<string>('server.apiKey') ?? process.env['API_KEY'] ?? '';
}

export function buildHeaders(): Record<string, string> {
  const key = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;
  return headers;
}

// ─── Terminal formatting ──────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

export const color = {
  green: (s: string) => `${GREEN}${s}${RESET}`,
  yellow: (s: string) => `${YELLOW}${s}${RESET}`,
  red: (s: string) => `${RED}${s}${RESET}`,
  cyan: (s: string) => `${CYAN}${s}${RESET}`,
  bold: (s: string) => `${BOLD}${s}${RESET}`,
  dim: (s: string) => `${DIM}${s}${RESET}`,
};

export function success(msg: string): void {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${YELLOW}⚠${RESET}  ${msg}`);
}

export function error(msg: string): void {
  console.error(`${RED}✗${RESET} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${CYAN}ℹ${RESET}  ${msg}`);
}

// ─── Table printer ────────────────────────────────────────────────────────────

export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxData = Math.max(...rows.map((r) => (r[i] ?? '').length));
    return Math.max(h.length, maxData);
  });

  const sep = colWidths.map((w) => '─'.repeat(w + 2)).join('┼');
  const header = headers.map((h, i) => ` ${h.padEnd(colWidths[i]!)} `).join('│');
  const divider = `┼${sep}┼`;
  const topBorder = `┌${colWidths.map((w) => '─'.repeat(w + 2)).join('┬')}┐`;
  const bottomBorder = `└${colWidths.map((w) => '─'.repeat(w + 2)).join('┴')}┘`;
  const midBorder = `├${colWidths.map((w) => '─'.repeat(w + 2)).join('┼')}┤`;

  console.log(topBorder);
  console.log(`│${header}│`);
  console.log(midBorder);

  for (const row of rows) {
    const line = row.map((cell, i) => ` ${(cell ?? '').padEnd(colWidths[i]!)} `).join('│');
    console.log(`│${line}│`);
  }

  console.log(bottomBorder);
  void divider; // used above for reference
}

// ─── JSON output ──────────────────────────────────────────────────────────────

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ─── Generic API request helper ───────────────────────────────────────────────

export async function apiRequest<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: unknown,
): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json() as T;
  if (!res.ok) {
    const msg = (data as any)?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ─── API error handling ───────────────────────────────────────────────────────

export function handleApiError(err: unknown): never {
  if (err instanceof Error) {
    if (err.message.includes('ECONNREFUSED')) {
      error('Cannot connect to WA Convo server. Is it running?');
      info('Start with: wa-convo start');
    } else {
      error(err.message);
    }
  } else {
    error(String(err));
  }
  process.exit(1);
}

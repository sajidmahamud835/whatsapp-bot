import { getApiBase, buildHeaders, handleApiError, printTable, color, success, error } from '../utils.js';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  clients: {
    total: number;
    ready: number;
    disconnected: number;
  };
}

interface ClientStatus {
  id: string;
  isInitialized: boolean;
  isReady: boolean;
  disconnected: boolean;
  phone?: string | null;
  name?: string | null;
}

export async function statusCommand(): Promise<void> {
  const base = getApiBase();

  try {
    const [healthRes, clientsRes] = await Promise.all([
      fetch(`${base}/health`, { headers: buildHeaders() }),
      fetch(`${base}/clients`, { headers: buildHeaders() }),
    ]);

    if (!healthRes.ok) {
      error(`Server returned ${healthRes.status}`);
      process.exit(1);
    }

    const health = await healthRes.json() as HealthResponse;
    const clients = (await clientsRes.json()) as ClientStatus[];

    console.log(`\n${color.bold('WA Convo')} — ${health.service ?? 'WhatsApp Automation Platform'}`);
    console.log(`Version:  ${color.cyan(health.version ?? '4.0.0')}`);
    console.log(`Status:   ${health.status === 'ok' ? color.green('● running') : color.red('● unhealthy')}`);
    console.log(`Uptime:   ${formatUptime(health.uptime ?? 0)}`);
    console.log(`API:      ${color.dim(base)}\n`);

    console.log(`${color.bold('Clients:')} ${health.clients?.ready ?? 0}/${health.clients?.total ?? 0} ready`);

    if (clients.length > 0) {
      const rows = clients.map((c) => [
        c.id,
        c.isReady ? color.green('ready') : c.isInitialized ? color.yellow('init') : color.dim('inactive'),
        c.disconnected ? color.red('disconnected') : color.green('connected'),
        c.phone ?? '-',
        c.name ?? '-',
      ]);
      console.log();
      printTable(['ID', 'Status', 'Connection', 'Phone', 'Name'], rows);
    }

    console.log();
  } catch (err) {
    handleApiError(err);
  }
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

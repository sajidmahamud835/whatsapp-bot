import { getApiBase, buildHeaders, handleApiError, printTable, color, success, error, info } from '../utils.js';

interface ClientStatus {
  id: string;
  isInitialized: boolean;
  isReady: boolean;
  disconnected: boolean;
  phone?: string | null;
  name?: string | null;
}

export async function clientListCommand(): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/clients`, { headers: buildHeaders() });
    if (!res.ok) {
      error(`Server returned ${res.status}`);
      process.exit(1);
    }
    const clients = (await res.json()) as ClientStatus[];

    if (clients.length === 0) {
      info('No clients configured');
      return;
    }

    const rows = clients.map((c) => [
      c.id,
      c.isReady ? color.green('ready') : c.isInitialized ? color.yellow('initializing') : color.dim('inactive'),
      c.phone ?? '-',
      c.name ?? '-',
    ]);

    console.log();
    printTable(['ID', 'Status', 'Phone', 'Name'], rows);
    console.log();
  } catch (err) {
    handleApiError(err);
  }
}

export async function clientInitCommand(id: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${id}/init`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    const data = await res.json() as { message?: string; error?: string };
    if (!res.ok) {
      error(data.error ?? `Server returned ${res.status}`);
      process.exit(1);
    }
    success(data.message ?? `Client ${id} initializing`);
    info(`Scan QR: wa-convo client qr ${id}`);
  } catch (err) {
    handleApiError(err);
  }
}

export async function clientQrCommand(id: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${id}/qr`, { headers: buildHeaders() });

    if (res.headers.get('content-type')?.includes('text/html')) {
      // QR available — fetch the raw QR data from status endpoint
      const statusRes = await fetch(`${base}/${id}/status`, { headers: buildHeaders() });
      const status = await statusRes.json() as { isReady?: boolean };

      if (status.isReady) {
        success(`Client ${id} is already authenticated`);
        return;
      }

      info('QR code is available. Opening in browser or visit:');
      console.log(color.cyan(`  ${base}/${id}/qr`));
      info('Or initialize first and check terminal output for QR');
      return;
    }

    const data = await res.json() as { message?: string; qrData?: string };
    if (res.status === 202) {
      warn(data.message ?? 'QR not generated yet');
      info(`Initialize first: wa-convo client init ${id}`);
      return;
    }
    if (data.message) {
      info(data.message);
    }
  } catch (err) {
    handleApiError(err);
  }
}

export async function clientLogoutCommand(id: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${id}/logout`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    const data = await res.json() as { message?: string; error?: string };
    if (!res.ok) {
      error(data.error ?? `Server returned ${res.status}`);
      process.exit(1);
    }
    success(data.message ?? `Client ${id} logged out`);
  } catch (err) {
    handleApiError(err);
  }
}

function warn(msg: string): void {
  console.log(`\x1b[33m⚠\x1b[0m  ${msg}`);
}

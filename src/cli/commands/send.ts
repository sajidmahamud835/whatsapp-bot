import { getApiBase, buildHeaders, handleApiError, success, error } from '../utils.js';

export async function sendCommand(clientId: string, number: string, message: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${clientId}/send`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ number, message }),
    });

    const data = await res.json() as { success?: boolean; messageId?: string; error?: string; message?: string };

    if (!res.ok) {
      error(data.error ?? data.message ?? `Server returned ${res.status}`);
      process.exit(1);
    }

    success(`Message sent! ID: ${data.messageId ?? 'unknown'}`);
  } catch (err) {
    handleApiError(err);
  }
}

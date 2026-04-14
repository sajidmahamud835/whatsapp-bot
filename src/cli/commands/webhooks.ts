import { apiRequest, handleApiError, success, error as errorLog, printTable, color } from '../utils.js';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

export async function webhooksListCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ webhooks: Webhook[] }>('/webhooks');
    if (data.webhooks.length === 0) {
      console.log('No webhooks registered. Use `wa-convo webhooks add <url>` to register one.');
      return;
    }
    printTable(
      ['ID', 'URL', 'Events', 'Enabled'],
      data.webhooks.map(w => [
        w.id.slice(0, 8) + '...',
        w.url.length > 40 ? w.url.slice(0, 40) + '...' : w.url,
        w.events.join(', '),
        w.enabled ? color.green('Yes') : color.red('No'),
      ]),
    );
  } catch (err) {
    handleApiError(err);
  }
}

export async function webhooksAddCommand(url: string, options?: { events?: string; secret?: string }): Promise<void> {
  try {
    const events = options?.events ? options.events.split(',').map(e => e.trim()) : ['*'];
    const data = await apiRequest<{ webhook: Webhook }>('/webhooks', 'POST', {
      url,
      events,
      secret: options?.secret ?? '',
    });
    success(`Webhook registered: ${data.webhook.id}`);
    console.log(`  URL: ${url}`);
    console.log(`  Events: ${events.join(', ')}`);
  } catch (err) {
    handleApiError(err);
  }
}

export async function webhooksRemoveCommand(id: string): Promise<void> {
  try {
    await apiRequest(`/webhooks/${id}`, 'DELETE');
    success(`Webhook ${id} deleted`);
  } catch (err) {
    handleApiError(err);
  }
}

export async function webhooksTestCommand(id: string): Promise<void> {
  try {
    const data = await apiRequest<{ success: boolean; statusCode?: number; error?: string }>(`/webhooks/${id}/test`, 'POST');
    if (data.success) {
      success(`Test delivery successful (HTTP ${data.statusCode})`);
    } else {
      errorLog(`Test delivery failed: ${data.error}`);
    }
  } catch (err) {
    handleApiError(err);
  }
}

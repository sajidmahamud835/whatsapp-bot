import { apiRequest, handleApiError, color } from '../utils.js';

interface Stats {
  uptimeFormatted: string;
  memory: { heapUsed: number };
  clients: { total: number; ready: number; disconnected: number };
  messages: { received24h: number; sent24h: number; totalStored: number };
  ai: { enabled: boolean; providers: string[]; totalConversations: number };
  cron: { totalJobs: number; activeJobs: number; executionsToday: number };
  webhooks: { registered: number; deliveries24h: number };
}

export async function statsCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ stats: Stats }>('/stats');
    const s = data.stats;
    const memMB = Math.round(s.memory.heapUsed / 1024 / 1024);

    console.log(`\n${color.bold('WA Convo Stats')}\n`);
    console.log(`  Uptime:     ${color.green(s.uptimeFormatted)}`);
    console.log(`  Memory:     ${memMB} MB`);
    console.log('');
    console.log(`  ${color.bold('Clients')}:    ${color.green(String(s.clients.ready))}/${s.clients.total} ready, ${s.clients.disconnected} disconnected`);
    console.log(`  ${color.bold('Messages')}:   ${s.messages.received24h} received / ${s.messages.sent24h} sent (24h), ${s.messages.totalStored} total stored`);
    console.log(`  ${color.bold('AI')}:         ${s.ai.enabled ? color.green('Enabled') : color.dim('Disabled')} (${s.ai.providers.length} providers, ${s.ai.totalConversations} conversations)`);
    console.log(`  ${color.bold('Cron')}:       ${s.cron.activeJobs}/${s.cron.totalJobs} active, ${s.cron.executionsToday} runs today`);
    console.log(`  ${color.bold('Webhooks')}:   ${s.webhooks.registered} registered, ${s.webhooks.deliveries24h} deliveries (24h)`);
    console.log('');
  } catch (err) {
    handleApiError(err);
  }
}

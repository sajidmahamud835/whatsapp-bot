import { apiRequest, handleApiError, printTable, success, info, color } from '../utils.js';

export async function campaignsListCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ campaigns: any[] }>('/pro/campaigns');
    if (!data.campaigns.length) { info('No campaigns.'); return; }
    printTable(
      ['Name', 'Status', 'Recipients', 'Sent', 'Failed'],
      data.campaigns.map(c => [
        c.name,
        c.status,
        String(c.audience_data?.length ?? 0),
        String(c.stats?.sent ?? '—'),
        String(c.stats?.failed ?? '—'),
      ]),
    );
  } catch (err) { handleApiError(err); }
}

export async function campaignsCreateCommand(options: { name: string; client: string; message: string; numbers: string }): Promise<void> {
  try {
    const nums = options.numbers.split(',').map(n => n.trim()).filter(Boolean);
    const data = await apiRequest<{ campaign: any }>('/pro/campaigns', 'POST', {
      name: options.name,
      client_id: options.client,
      message: options.message,
      audience_data: nums,
      audience_type: 'numbers',
    });
    success(`Campaign created: ${data.campaign.name} (${nums.length} recipients)`);
    console.log(`  ${color.dim('ID:')} ${data.campaign.id}`);
    console.log(`  ${color.dim('Status:')} draft — use ${color.cyan(`wa-convo campaigns send ${data.campaign.id.slice(0, 8)}`)} to send`);
  } catch (err) { handleApiError(err); }
}

export async function campaignsSendCommand(id: string): Promise<void> {
  try {
    // Find by ID prefix
    const list = await apiRequest<{ campaigns: any[] }>('/pro/campaigns');
    const campaign = list.campaigns.find(c => c.id.startsWith(id) || c.id === id);
    if (!campaign) { throw new Error(`Campaign "${id}" not found`); }

    console.log(`Sending "${campaign.name}" to ${campaign.audience_data.length} recipients...`);
    const data = await apiRequest<{ stats: any }>(`/pro/campaigns/${campaign.id}/send`, 'POST');
    success(`Campaign sent! ${data.stats.sent} delivered, ${data.stats.failed} failed`);
  } catch (err) { handleApiError(err); }
}

export async function campaignsDeleteCommand(id: string): Promise<void> {
  try {
    const list = await apiRequest<{ campaigns: any[] }>('/pro/campaigns');
    const campaign = list.campaigns.find(c => c.id.startsWith(id) || c.id === id);
    if (!campaign) { throw new Error(`Campaign "${id}" not found`); }
    await apiRequest(`/pro/campaigns/${campaign.id}`, 'DELETE');
    success(`Campaign "${campaign.name}" deleted`);
  } catch (err) { handleApiError(err); }
}

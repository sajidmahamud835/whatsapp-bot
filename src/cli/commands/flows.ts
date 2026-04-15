import { readFileSync, writeFileSync } from 'fs';
import { apiRequest, handleApiError, printTable, success, info, color } from '../utils.js';

export async function flowsListCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ flows: any[] }>('/pro/flows');
    if (!data.flows.length) { info('No flows.'); return; }
    printTable(
      ['Name', 'Status', 'Trigger', 'Nodes', 'Edges', 'Client'],
      data.flows.map(f => [
        f.name,
        f.enabled ? color.green('ON') : color.dim('OFF'),
        f.trigger_type,
        String(f.nodes?.length ?? 0),
        String(f.edges?.length ?? 0),
        f.client_id,
      ]),
    );
  } catch (err) { handleApiError(err); }
}

export async function flowsEnableCommand(id: string): Promise<void> {
  try {
    const flow = await findFlow(id);
    const data = await apiRequest<{ flow: any }>(`/pro/flows/${flow.id}/toggle`, 'PUT');
    success(`${flow.name}: ${data.flow.enabled ? color.green('ENABLED') : color.dim('DISABLED')}`);
  } catch (err) { handleApiError(err); }
}

export async function flowsDisableCommand(id: string): Promise<void> {
  // Same as enable — toggle
  await flowsEnableCommand(id);
}

export async function flowsExportCommand(id: string, output?: string): Promise<void> {
  try {
    const flow = await findFlow(id);
    const data = await apiRequest<any>(`/pro/flows/${flow.id}/export`);
    const filename = output || `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    writeFileSync(filename, JSON.stringify(data, null, 2));
    success(`Flow "${flow.name}" exported to ${filename}`);
  } catch (err) { handleApiError(err); }
}

export async function flowsImportCommand(file: string): Promise<void> {
  try {
    const content = readFileSync(file, 'utf-8');
    const data = JSON.parse(content);
    const result = await apiRequest<{ flow: any }>('/pro/flows/import', 'POST', data);
    success(`Flow imported: ${result.flow.name} (${result.flow.nodes?.length ?? 0} nodes)`);
  } catch (err) { handleApiError(err); }
}

export async function flowsDeleteCommand(id: string): Promise<void> {
  try {
    const flow = await findFlow(id);
    await apiRequest(`/pro/flows/${flow.id}`, 'DELETE');
    success(`Flow "${flow.name}" deleted`);
  } catch (err) { handleApiError(err); }
}

export async function flowsTestCommand(id: string, message: string): Promise<void> {
  try {
    const flow = await findFlow(id);
    await apiRequest(`/pro/flows/${flow.id}/test`, 'POST', { message });
    success(`Flow "${flow.name}" test executed with message: "${message}"`);
  } catch (err) { handleApiError(err); }
}

export async function analyticsCommand(_options: { period?: string }): Promise<void> {
  try {
    const data = await apiRequest<{ overview: any }>('/pro/analytics/overview');
    const o = data.overview;
    console.log(`\n${color.bold('Analytics Overview')}\n`);
    console.log(`  ${color.bold('Messages')}:      ${o.messagesToday} today, ${o.messagesThisWeek} this week, ${o.messagesThisMonth} this month`);
    console.log(`  ${color.bold('Conversations')}: ${o.activeConversations} active`);
    console.log(`  ${color.bold('AI Replies')}:    ${o.aiReplies}`);
    console.log(`  ${color.bold('Contacts')}:      ${o.totalContacts}`);
    console.log(`  ${color.bold('Campaigns')}:     ${o.totalCampaigns}`);
    console.log('');
  } catch (err) { handleApiError(err); }
}

// Helper: find flow by ID prefix or name
async function findFlow(idOrName: string): Promise<any> {
  const data = await apiRequest<{ flows: any[] }>('/pro/flows');
  const flow = data.flows.find(f =>
    f.id.startsWith(idOrName) || f.id === idOrName || f.name.toLowerCase() === idOrName.toLowerCase()
  );
  if (!flow) throw new Error(`Flow "${idOrName}" not found`);
  return flow;
}

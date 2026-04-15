import { apiRequest, handleApiError, printTable, color, info } from '../utils.js';

export async function messagesConversationsCommand(clientId: string): Promise<void> {
  try {
    const data = await apiRequest<{ conversations: any[] }>(`/${clientId}/messages/conversations?limit=20`);
    if (!data.conversations.length) { info('No conversations yet.'); return; }
    printTable(
      ['Contact', 'Messages', 'In', 'Out', 'Last Message'],
      data.conversations.map(c => [
        c.jid.replace('@s.whatsapp.net', '').replace('@g.us', ' (group)'),
        String(c.message_count),
        String(c.received),
        String(c.sent),
        (c.last_message || '(media)').slice(0, 40),
      ]),
    );
  } catch (err) { handleApiError(err); }
}

export async function messagesHistoryCommand(clientId: string, jid: string, options: { limit?: string }): Promise<void> {
  try {
    const fullJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    const limit = options.limit || '20';
    const data = await apiRequest<{ messages: any[] }>(`/${clientId}/messages/conversation/${encodeURIComponent(fullJid)}?limit=${limit}`);
    if (!data.messages.length) { info('No messages in this conversation.'); return; }
    // Show oldest first
    const msgs = [...data.messages].reverse();
    for (const m of msgs) {
      const dir = m.from_me ? color.green('→ YOU') : color.cyan('← IN ');
      const time = new Date(m.timestamp * 1000).toLocaleTimeString();
      const body = m.body || `(${m.type})`;
      console.log(`  ${color.dim(time)} ${dir}  ${body}`);
    }
    console.log(`\n  ${color.dim(`${msgs.length} messages shown`)}`);
  } catch (err) { handleApiError(err); }
}

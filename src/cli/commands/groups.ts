import { getApiBase, buildHeaders, handleApiError, printTable, color, success, error, info } from '../utils.js';

interface Group {
  id: string;
  subject: string;
  participantCount: number;
  owner: string | null;
  creation: number | null;
}

export async function groupsListCommand(clientId: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${clientId}/groups`, { headers: buildHeaders() });
    const data = await res.json() as { success?: boolean; total?: number; data?: Group[]; error?: string };

    if (!res.ok) {
      error(data.error ?? `Server returned ${res.status}`);
      process.exit(1);
    }

    const groups = data.data ?? [];
    if (groups.length === 0) {
      info('No groups found');
      return;
    }

    const rows = groups.map((g) => [
      g.id,
      g.subject,
      String(g.participantCount),
      g.creation ? new Date(g.creation * 1000).toLocaleDateString() : '-',
    ]);

    console.log();
    printTable(['Group ID', 'Name', 'Members', 'Created'], rows);
    console.log(`\n${color.dim(`Total: ${data.total ?? groups.length} groups`)}\n`);
  } catch (err) {
    handleApiError(err);
  }
}

export async function groupsCreateCommand(clientId: string, name: string, participants: string[]): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${clientId}/groups/create`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ name, participants }),
    });
    const data = await res.json() as { success?: boolean; groupId?: string; subject?: string; error?: string };

    if (!res.ok) {
      error(data.error ?? `Server returned ${res.status}`);
      process.exit(1);
    }

    success(`Group created: ${data.subject ?? name} (${data.groupId})`);
  } catch (err) {
    handleApiError(err);
  }
}

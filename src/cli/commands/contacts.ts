import { getApiBase, buildHeaders, handleApiError, printTable, color, success, error, info } from '../utils.js';

interface Contact {
  id: string;
  name: string | null;
  number: string;
  isGroup: boolean;
}

interface CheckResult {
  jid: string;
  exists: boolean;
  number: string;
}

export async function contactsListCommand(clientId: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${clientId}/contacts`, { headers: buildHeaders() });
    const data = await res.json() as Contact[] | { error?: string };

    if (!res.ok) {
      error((data as { error?: string }).error ?? `Server returned ${res.status}`);
      process.exit(1);
    }

    const contacts = data as Contact[];
    if (contacts.length === 0) {
      info('No contacts found');
      return;
    }

    const rows = contacts
      .filter((c) => !c.isGroup)
      .slice(0, 100)
      .map((c) => [c.number, c.name ?? '-', c.id]);

    console.log();
    printTable(['Number', 'Name', 'JID'], rows);
    console.log(`\n${color.dim(`Showing ${rows.length} contacts`)}\n`);
  } catch (err) {
    handleApiError(err);
  }
}

export async function contactsCheckCommand(clientId: string, number: string): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/${clientId}/contacts/check`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ numbers: [number] }),
    });
    const data = await res.json() as { success?: boolean; data?: CheckResult[]; error?: string };

    if (!res.ok) {
      error(data.error ?? `Server returned ${res.status}`);
      process.exit(1);
    }

    const result = data.data?.[0];
    if (!result) {
      error('No result returned');
      process.exit(1);
    }

    if (result.exists) {
      success(`${number} is on WhatsApp (${result.jid})`);
    } else {
      console.log(`${color.yellow('✗')} ${number} is NOT on WhatsApp`);
    }
  } catch (err) {
    handleApiError(err);
  }
}

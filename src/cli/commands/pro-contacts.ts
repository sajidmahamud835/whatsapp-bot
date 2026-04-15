import { readFileSync, writeFileSync } from 'fs';
import { apiRequest, handleApiError, printTable, success, info, color } from '../utils.js';

export async function proContactsListCommand(options: { search?: string; tag?: string }): Promise<void> {
  try {
    let url = '/pro/contacts?limit=50';
    if (options.search) url += `&search=${encodeURIComponent(options.search)}`;
    if (options.tag) url += `&tag=${options.tag}`;
    const data = await apiRequest<{ contacts: any[]; total: number }>(url);
    if (!data.contacts.length) { info('No contacts found.'); return; }
    printTable(
      ['Name', 'Phone', 'Email', 'Tags'],
      data.contacts.map(c => [
        c.name || '—',
        c.phone,
        c.email || '—',
        (c.tags || []).join(', ') || '—',
      ]),
    );
    console.log(`  ${color.dim(`${data.total} total`)}`);
  } catch (err) { handleApiError(err); }
}

export async function proContactsAddCommand(phone: string, options: { name?: string; email?: string }): Promise<void> {
  try {
    await apiRequest('/pro/contacts', 'POST', { phone, name: options.name, email: options.email });
    success(`Contact added: ${phone}`);
  } catch (err) { handleApiError(err); }
}

export async function proContactsDeleteCommand(id: string): Promise<void> {
  try {
    await apiRequest(`/pro/contacts/${id}`, 'DELETE');
    success(`Contact deleted`);
  } catch (err) { handleApiError(err); }
}

export async function proContactsImportCommand(file: string): Promise<void> {
  try {
    const content = readFileSync(file, 'utf-8');
    const contacts = content.trim().split('\n').filter(Boolean).map(line => {
      const [phone, name] = line.split(',').map(s => s.trim());
      return { phone: phone || '', name };
    }).filter(c => c.phone);
    const data = await apiRequest<{ imported: number; skipped: number }>('/pro/contacts/import', 'POST', { contacts });
    success(`Imported ${data.imported}, skipped ${data.skipped}`);
  } catch (err) { handleApiError(err); }
}

export async function proContactsExportCommand(output: string): Promise<void> {
  try {
    const data = await apiRequest<{ contacts: any[] }>('/pro/contacts?limit=10000');
    const rows = ['Name,Phone,Email,Tags', ...data.contacts.map(c =>
      `"${c.name || ''}","${c.phone}","${c.email || ''}","${(c.tags || []).join('; ')}"`
    )];
    writeFileSync(output, rows.join('\n'));
    success(`Exported ${data.contacts.length} contacts to ${output}`);
  } catch (err) { handleApiError(err); }
}

export async function proTagsListCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ tags: any[] }>('/pro/tags');
    if (!data.tags.length) { info('No tags.'); return; }
    printTable(['Name', 'Contacts'], data.tags.map(t => [t.name, String(t.contact_count ?? 0)]));
  } catch (err) { handleApiError(err); }
}

export async function proTagsAddCommand(name: string): Promise<void> {
  try {
    await apiRequest('/pro/tags', 'POST', { name });
    success(`Tag created: ${name}`);
  } catch (err) { handleApiError(err); }
}

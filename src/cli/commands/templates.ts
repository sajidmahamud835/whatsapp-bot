import { apiRequest, handleApiError, printTable, success, info, color } from '../utils.js';

export async function templatesListCommand(): Promise<void> {
  try {
    const data = await apiRequest<{ templates: any[] }>('/pro/templates');
    if (!data.templates.length) { info('No templates.'); return; }
    printTable(
      ['Name', 'Category', 'Variables', 'Preview'],
      data.templates.map(t => [
        t.name,
        t.category,
        (t.variables || []).map((v: string) => `{{${v}}}`).join(', ') || '—',
        (t.body || '').slice(0, 40),
      ]),
    );
  } catch (err) { handleApiError(err); }
}

export async function templatesSendCommand(templateName: string, clientId: string, number: string, options: { vars?: string }): Promise<void> {
  try {
    // Find template by name
    const data = await apiRequest<{ templates: any[] }>('/pro/templates');
    const template = data.templates.find(t => t.name.toLowerCase() === templateName.toLowerCase() || t.id === templateName);
    if (!template) { throw new Error(`Template "${templateName}" not found`); }

    // Parse variables
    let variables: Record<string, string> = {};
    if (options.vars) {
      options.vars.split(',').forEach(pair => {
        const [k, v] = pair.split('=').map(s => s.trim());
        if (k && v) variables[k] = v;
      });
    }

    const result = await apiRequest<{ rendered: string }>(`/pro/templates/${template.id}/send`, 'POST', { clientId, number, variables });
    success(`Template sent to ${number}`);
    console.log(`  ${color.dim('Message:')} ${result.rendered}`);
  } catch (err) { handleApiError(err); }
}

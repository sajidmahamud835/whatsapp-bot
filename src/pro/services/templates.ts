import { randomUUID } from 'crypto';
import { getProDatabase } from '../db/pro-database.js';

export interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export const templatesService = {
  list(category?: string): Template[] {
    const db = getProDatabase();
    let stmt;
    if (category) {
      stmt = db.prepare('SELECT * FROM pro_templates WHERE category = ? ORDER BY name');
      return (stmt.all(category) as any[]).map(rowToTemplate);
    }
    stmt = db.prepare('SELECT * FROM pro_templates ORDER BY category, name');
    return (stmt.all() as any[]).map(rowToTemplate);
  },

  get(id: string): Template | null {
    const db = getProDatabase();
    const row = db.prepare('SELECT * FROM pro_templates WHERE id = ?').get(id) as any;
    return row ? rowToTemplate(row) : null;
  },

  create(data: { name: string; body: string; category?: string }): Template {
    const db = getProDatabase();
    const id = randomUUID();
    const variables = extractVariables(data.body);

    db.prepare(`
      INSERT INTO pro_templates (id, name, category, body, variables)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.category ?? 'general', data.body, JSON.stringify(variables));

    return this.get(id)!;
  },

  update(id: string, data: Partial<{ name: string; body: string; category: string }>): Template {
    const db = getProDatabase();
    const existing = db.prepare('SELECT id FROM pro_templates WHERE id = ?').get(id);
    if (!existing) throw new Error(`Template ${id} not found`);

    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.category !== undefined) { sets.push('category = ?'); params.push(data.category); }
    if (data.body !== undefined) {
      sets.push('body = ?', 'variables = ?');
      params.push(data.body, JSON.stringify(extractVariables(data.body)));
    }

    params.push(id);
    db.prepare(`UPDATE pro_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.get(id)!;
  },

  delete(id: string): void {
    const db = getProDatabase();
    const result = db.prepare('DELETE FROM pro_templates WHERE id = ?').run(id);
    if (result.changes === 0) throw new Error(`Template ${id} not found`);
  },

  /**
   * Render a template body with variable substitutions.
   * Variables in the body are in {{variableName}} format.
   */
  render(body: string, variables: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return variables[key] ?? match;
    });
  },
};

/**
 * Extract {{variable}} names from template body.
 */
function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  for (const match of matches) {
    vars.add(match[1]!);
  }
  return [...vars];
}

function rowToTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    body: row.body,
    variables: JSON.parse(row.variables || '[]'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

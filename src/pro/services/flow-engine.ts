import { randomUUID } from 'crypto';
import { getProDatabase } from '../db/pro-database.js';
import { sessions } from '../../core/client-manager.js';
import { aiManager } from '../../core/ai/manager.js';
import { contactsService } from './contacts.js';
import { templatesService } from './templates.js';
import axios from 'axios';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface BotFlow {
  id: string;
  name: string;
  description: string;
  client_id: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ExecutionContext {
  flowId: string;
  clientId: string;
  jid: string;
  message: string;
  variables: Record<string, any>;
  nodesExecuted: number;
}

// ─── Flow CRUD ───────────────────────────────────────────────────────────────

export const flowService = {
  list(): BotFlow[] {
    const db = getProDatabase();
    const rows = db.prepare('SELECT * FROM pro_flows ORDER BY updated_at DESC').all() as any[];
    return rows.map(parseFlowRow);
  },

  get(id: string): BotFlow | null {
    const db = getProDatabase();
    const row = db.prepare('SELECT * FROM pro_flows WHERE id = ?').get(id) as any;
    return row ? parseFlowRow(row) : null;
  },

  create(data: { name: string; description?: string; client_id?: string; trigger_type?: string; trigger_config?: Record<string, any>; nodes?: FlowNode[]; edges?: FlowEdge[] }): BotFlow {
    const db = getProDatabase();
    const id = randomUUID();
    db.prepare(`
      INSERT INTO pro_flows (id, name, description, client_id, trigger_type, trigger_config, nodes, edges)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.description ?? '', data.client_id ?? '1',
      data.trigger_type ?? 'message', JSON.stringify(data.trigger_config ?? {}),
      JSON.stringify(data.nodes ?? []), JSON.stringify(data.edges ?? []),
    );
    return this.get(id)!;
  },

  update(id: string, data: Partial<{ name: string; description: string; client_id: string; trigger_type: string; trigger_config: Record<string, any>; nodes: FlowNode[]; edges: FlowEdge[]; variables: Record<string, any>; enabled: boolean }>): BotFlow {
    const db = getProDatabase();
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: any[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
    if (data.client_id !== undefined) { sets.push('client_id = ?'); params.push(data.client_id); }
    if (data.trigger_type !== undefined) { sets.push('trigger_type = ?'); params.push(data.trigger_type); }
    if (data.trigger_config !== undefined) { sets.push('trigger_config = ?'); params.push(JSON.stringify(data.trigger_config)); }
    if (data.nodes !== undefined) { sets.push('nodes = ?'); params.push(JSON.stringify(data.nodes)); }
    if (data.edges !== undefined) { sets.push('edges = ?'); params.push(JSON.stringify(data.edges)); }
    if (data.variables !== undefined) { sets.push('variables = ?'); params.push(JSON.stringify(data.variables)); }
    if (data.enabled !== undefined) { sets.push('enabled = ?'); params.push(data.enabled ? 1 : 0); }

    params.push(id);
    db.prepare(`UPDATE pro_flows SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.get(id)!;
  },

  delete(id: string): void {
    const db = getProDatabase();
    db.prepare('DELETE FROM pro_flows WHERE id = ?').run(id);
  },

  duplicate(id: string): BotFlow {
    const flow = this.get(id);
    if (!flow) throw new Error('Flow not found');
    return this.create({
      name: `${flow.name} (copy)`,
      description: flow.description,
      client_id: flow.client_id,
      trigger_type: flow.trigger_type,
      trigger_config: flow.trigger_config,
      nodes: flow.nodes,
      edges: flow.edges,
    });
  },

  getExecutions(flowId: string, limit = 50): any[] {
    const db = getProDatabase();
    return db.prepare('SELECT * FROM pro_flow_executions WHERE flow_id = ? ORDER BY started_at DESC LIMIT ?').all(flowId, limit);
  },
};

// ─── Flow Execution Engine ───────────────────────────────────────────────────

export async function executeFlow(flow: BotFlow, clientId: string, jid: string, incomingMessage: string): Promise<void> {
  const db = getProDatabase();

  // Check if there's a pending conversation state (user was waiting for input)
  const existingState = db.prepare(
    'SELECT * FROM pro_flow_state WHERE flow_id = ? AND jid = ? AND waiting_for_input = 1'
  ).get(flow.id, jid) as any;

  let startNodeId: string;
  const variables: Record<string, any> = {
    message: incomingMessage,
    sender: jid,
    sender_number: jid.replace('@s.whatsapp.net', ''),
    timestamp: Date.now(),
    ...(flow.variables || {}),
  };

  if (existingState) {
    // Resume from where we left off
    startNodeId = existingState.current_node_id;
    Object.assign(variables, JSON.parse(existingState.variables || '{}'));
    variables.message = incomingMessage; // Update with new message
    // Clear the waiting state
    db.prepare('DELETE FROM pro_flow_state WHERE id = ?').run(existingState.id);
  } else {
    // Find the trigger/start node
    const triggerNode = flow.nodes.find(n => n.type === 'trigger' || n.type === 'start');
    if (!triggerNode) return;
    startNodeId = triggerNode.id;
  }

  // Log execution start
  const execId = db.prepare(`
    INSERT INTO pro_flow_executions (flow_id, client_id, jid, trigger_data, status)
    VALUES (?, ?, ?, ?, 'running')
  `).run(flow.id, clientId, jid, JSON.stringify({ message: incomingMessage })).lastInsertRowid;

  const ctx: ExecutionContext = { flowId: flow.id, clientId, jid, message: incomingMessage, variables, nodesExecuted: 0 };

  try {
    await executeFromNode(flow, startNodeId, ctx);

    db.prepare("UPDATE pro_flow_executions SET status = 'completed', nodes_executed = ?, completed_at = datetime('now') WHERE id = ?")
      .run(ctx.nodesExecuted, execId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    db.prepare("UPDATE pro_flow_executions SET status = 'error', error = ?, nodes_executed = ?, completed_at = datetime('now') WHERE id = ?")
      .run(errMsg, ctx.nodesExecuted, execId);
  }
}

async function executeFromNode(flow: BotFlow, nodeId: string, ctx: ExecutionContext): Promise<void> {
  // Safety: max 50 nodes per execution to prevent infinite loops
  if (ctx.nodesExecuted > 50) throw new Error('Max node limit reached (50)');

  const node = flow.nodes.find(n => n.id === nodeId);
  if (!node) return;

  ctx.nodesExecuted++;

  const nextNodeId = await executeNode(flow, node, ctx);

  if (nextNodeId) {
    await executeFromNode(flow, nextNodeId, ctx);
  }
}

async function executeNode(flow: BotFlow, node: FlowNode, ctx: ExecutionContext): Promise<string | null> {
  const session = sessions.get(ctx.clientId);

  switch (node.type) {
    case 'trigger':
    case 'start': {
      // Just pass through to next node
      return getNextNode(flow, node.id);
    }

    case 'send_message': {
      const text = interpolateVars(node.data.message || '', ctx.variables);
      if (session?.sock && text) {
        await session.sock.sendMessage(ctx.jid, { text });
      }
      return getNextNode(flow, node.id);
    }

    case 'send_media': {
      const url = interpolateVars(node.data.url || '', ctx.variables);
      const caption = interpolateVars(node.data.caption || '', ctx.variables);
      if (session?.sock && url) {
        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(resp.data);
        const mime = String(resp.headers['content-type'] || 'image/jpeg');
        if (mime.startsWith('image/')) {
          await session.sock.sendMessage(ctx.jid, { image: buffer, caption });
        } else if (mime.startsWith('video/')) {
          await session.sock.sendMessage(ctx.jid, { video: buffer, caption });
        } else {
          await session.sock.sendMessage(ctx.jid, { document: buffer, caption, mimetype: mime });
        }
      }
      return getNextNode(flow, node.id);
    }

    case 'send_template': {
      const templateId = node.data.templateId;
      if (templateId) {
        const template = templatesService.get(templateId);
        if (template && session?.sock) {
          const text = templatesService.render(template.body, ctx.variables);
          await session.sock.sendMessage(ctx.jid, { text });
        }
      }
      return getNextNode(flow, node.id);
    }

    case 'ai_reply': {
      const provider = node.data.provider || undefined;
      try {
        const reply = await aiManager.chat(ctx.jid, ctx.message, provider);
        ctx.variables.ai_reply = reply;
        if (session?.sock && reply) {
          await session.sock.sendMessage(ctx.jid, { text: reply });
        }
      } catch {
        ctx.variables.ai_reply = '';
      }
      return getNextNode(flow, node.id);
    }

    case 'condition': {
      const field = interpolateVars(node.data.field || '{{message}}', ctx.variables);
      const operator = node.data.operator || 'contains';
      const value = node.data.value || '';
      const result = evaluateCondition(field, operator, value);

      // Find edges from this node — "true" handle goes one way, "false" another
      const trueEdge = flow.edges.find(e => e.source === node.id && e.sourceHandle === 'true');
      const falseEdge = flow.edges.find(e => e.source === node.id && e.sourceHandle === 'false');

      return result ? (trueEdge?.target ?? null) : (falseEdge?.target ?? null);
    }

    case 'delay': {
      const ms = (node.data.seconds || 1) * 1000;
      await new Promise(r => setTimeout(r, Math.min(ms, 30000))); // Max 30s
      return getNextNode(flow, node.id);
    }

    case 'set_variable': {
      const varName = node.data.variable || 'custom';
      const varValue = interpolateVars(node.data.value || '', ctx.variables);
      ctx.variables[varName] = varValue;
      return getNextNode(flow, node.id);
    }

    case 'add_tag': {
      const tagName = node.data.tag || '';
      if (tagName) {
        const contact = contactsService.getByJid(ctx.jid);
        if (contact) {
          // Find or create tag, then add to contact
          const tags = contactsService.listTags();
          let tag = tags.find(t => t.name === tagName);
          if (!tag) tag = contactsService.createTag(tagName);
          contactsService.update(contact.id, { tags: [...contact.tags, tag.name] });
        }
      }
      return getNextNode(flow, node.id);
    }

    case 'http_request': {
      const url = interpolateVars(node.data.url || '', ctx.variables);
      const method = node.data.method || 'GET';
      try {
        const resp = await axios({ method, url, data: node.data.body ? JSON.parse(interpolateVars(node.data.body, ctx.variables)) : undefined, timeout: 10000 });
        ctx.variables.http_status = resp.status;
        ctx.variables.http_response = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      } catch (err: any) {
        ctx.variables.http_status = err?.response?.status || 0;
        ctx.variables.http_response = err?.message || 'Request failed';
      }
      return getNextNode(flow, node.id);
    }

    case 'wait_for_reply': {
      // Save state and pause — will resume when user replies
      const db = getProDatabase();
      const nextNodeId = getNextNode(flow, node.id);
      if (nextNodeId) {
        db.prepare(`
          INSERT OR REPLACE INTO pro_flow_state (flow_id, jid, current_node_id, variables, waiting_for_input, expires_at, updated_at)
          VALUES (?, ?, ?, ?, 1, datetime('now', '+1 hour'), datetime('now'))
        `).run(flow.id, ctx.jid, nextNodeId, JSON.stringify(ctx.variables));
      }
      return null; // Stop execution — will resume on next message
    }

    case 'end':
    default:
      return null;
  }
}

// ─── Flow Trigger Matching ───────────────────────────────────────────────────

export function findMatchingFlows(clientId: string, jid: string, message: string): BotFlow[] {
  const db = getProDatabase();

  // First check if there's a waiting conversation state for this JID
  const waitingState = db.prepare(
    'SELECT flow_id FROM pro_flow_state WHERE jid = ? AND waiting_for_input = 1'
  ).all(jid) as { flow_id: string }[];

  const matchedFlows: BotFlow[] = [];

  // Resume waiting flows first
  for (const state of waitingState) {
    const flow = flowService.get(state.flow_id);
    if (flow && flow.enabled) matchedFlows.push(flow);
  }

  if (matchedFlows.length > 0) return matchedFlows;

  // Find enabled flows that match the trigger
  const enabledFlows = db.prepare(
    'SELECT * FROM pro_flows WHERE enabled = 1 AND client_id = ?'
  ).all(clientId) as any[];

  for (const row of enabledFlows) {
    const flow = parseFlowRow(row);
    const config = flow.trigger_config;

    switch (flow.trigger_type) {
      case 'message':
        // Match all messages (or filter by keyword)
        if (!config.keyword || message.toLowerCase().includes(config.keyword.toLowerCase())) {
          matchedFlows.push(flow);
        }
        break;

      case 'keyword':
        if (config.keywords?.some((kw: string) => message.toLowerCase().includes(kw.toLowerCase()))) {
          matchedFlows.push(flow);
        }
        break;

      case 'exact':
        if (message.toLowerCase() === (config.text || '').toLowerCase()) {
          matchedFlows.push(flow);
        }
        break;

      case 'regex':
        try {
          if (new RegExp(config.pattern || '', config.flags || 'i').test(message)) {
            matchedFlows.push(flow);
          }
        } catch { /* invalid regex, skip */ }
        break;

      case 'starts_with':
        if (message.toLowerCase().startsWith((config.prefix || '').toLowerCase())) {
          matchedFlows.push(flow);
        }
        break;
    }
  }

  return matchedFlows;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFlowRow(row: any): BotFlow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    client_id: row.client_id,
    trigger_type: row.trigger_type,
    trigger_config: JSON.parse(row.trigger_config || '{}'),
    nodes: JSON.parse(row.nodes || '[]'),
    edges: JSON.parse(row.edges || '[]'),
    variables: JSON.parse(row.variables || '{}'),
    enabled: row.enabled === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getNextNode(flow: BotFlow, currentNodeId: string): string | null {
  const edge = flow.edges.find(e => e.source === currentNodeId);
  return edge?.target ?? null;
}

function interpolateVars(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return String(vars[key] ?? '');
  });
}

function evaluateCondition(field: string, operator: string, value: string): boolean {
  const f = field.toLowerCase();
  const v = value.toLowerCase();

  switch (operator) {
    case 'contains': return f.includes(v);
    case 'not_contains': return !f.includes(v);
    case 'equals': return f === v;
    case 'not_equals': return f !== v;
    case 'starts_with': return f.startsWith(v);
    case 'ends_with': return f.endsWith(v);
    case 'regex': try { return new RegExp(value, 'i').test(field); } catch { return false; }
    case 'is_empty': return field.trim() === '';
    case 'is_not_empty': return field.trim() !== '';
    default: return false;
  }
}

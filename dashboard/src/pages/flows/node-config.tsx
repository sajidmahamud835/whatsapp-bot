import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { X } from 'lucide-react';

interface NodeConfigProps {
  node: { id: string; type: string; data: Record<string, any> };
  onChange: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, onChange, onClose, onDelete }: NodeConfigProps) {
  const update = (key: string, value: any) => {
    onChange(node.id, { ...node.data, [key]: value });
  };

  return (
    <div className="w-80 border-l border-[#30363d] bg-[#161b22] h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
        <h3 className="text-sm font-bold text-[#e6edf3]">Configure Node</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"><X className="h-4 w-4" /></button>
      </div>

      <div className="p-4 space-y-4">
        <Input label="Label" value={node.data.label || ''} onChange={e => update('label', e.target.value)} placeholder="Node name" />

        {/* Trigger config */}
        {node.type === 'trigger' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#e6edf3]">Trigger Type</label>
              <select value={node.data.triggerType || 'message'} onChange={e => update('triggerType', e.target.value)} className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                <option value="message">Any Message</option>
                <option value="keyword">Contains Keyword</option>
                <option value="exact">Exact Match</option>
                <option value="starts_with">Starts With</option>
                <option value="regex">Regex Match</option>
              </select>
            </div>
            {node.data.triggerType && node.data.triggerType !== 'message' && (
              <Input label="Value" value={node.data.triggerValue || ''} onChange={e => update('triggerValue', e.target.value)} placeholder="Enter trigger value" />
            )}
          </>
        )}

        {/* Send Message */}
        {node.type === 'send_message' && (
          <Textarea label="Message" value={node.data.message || ''} onChange={e => update('message', e.target.value)} placeholder="Hello {{sender_number}}! How can I help?" />
        )}

        {/* Send Media */}
        {node.type === 'send_media' && (
          <>
            <Input label="Media URL" value={node.data.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://example.com/image.jpg" />
            <Input label="Caption" value={node.data.caption || ''} onChange={e => update('caption', e.target.value)} placeholder="Optional caption" />
          </>
        )}

        {/* Send Template */}
        {node.type === 'send_template' && (
          <Input label="Template ID" value={node.data.templateId || ''} onChange={e => update('templateId', e.target.value)} placeholder="Template UUID" />
        )}

        {/* AI Reply */}
        {node.type === 'ai_reply' && (
          <>
            <Input label="Provider (optional)" value={node.data.provider || ''} onChange={e => update('provider', e.target.value)} placeholder="Default provider" />
            <Textarea label="Custom System Prompt" value={node.data.systemPrompt || ''} onChange={e => update('systemPrompt', e.target.value)} placeholder="Override system prompt for this node" />
          </>
        )}

        {/* Condition */}
        {node.type === 'condition' && (
          <>
            <Input label="Field" value={node.data.field || '{{message}}'} onChange={e => update('field', e.target.value)} placeholder="{{message}}" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#e6edf3]">Operator</label>
              <select value={node.data.operator || 'contains'} onChange={e => update('operator', e.target.value)} className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                <option value="contains">Contains</option>
                <option value="not_contains">Not Contains</option>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="regex">Regex Match</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>
            <Input label="Value" value={node.data.value || ''} onChange={e => update('value', e.target.value)} placeholder="Compare value" />
          </>
        )}

        {/* Delay */}
        {node.type === 'delay' && (
          <Input label="Seconds" type="number" value={node.data.seconds || 1} onChange={e => update('seconds', Number(e.target.value))} placeholder="1" />
        )}

        {/* Set Variable */}
        {node.type === 'set_variable' && (
          <>
            <Input label="Variable Name" value={node.data.variable || ''} onChange={e => update('variable', e.target.value)} placeholder="my_var" />
            <Input label="Value" value={node.data.value || ''} onChange={e => update('value', e.target.value)} placeholder="Use {{message}} for input" />
          </>
        )}

        {/* Add Tag */}
        {node.type === 'add_tag' && (
          <Input label="Tag Name" value={node.data.tag || ''} onChange={e => update('tag', e.target.value)} placeholder="vip, support, new" />
        )}

        {/* HTTP Request */}
        {node.type === 'http_request' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#e6edf3]">Method</label>
              <select value={node.data.method || 'GET'} onChange={e => update('method', e.target.value)} className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <Input label="URL" value={node.data.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://api.example.com/data" />
            <Textarea label="Body (JSON)" value={node.data.body || ''} onChange={e => update('body', e.target.value)} placeholder='{"key": "{{message}}"}' />
          </>
        )}

        {/* Variables hint */}
        <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-3">
          <p className="text-[10px] font-semibold text-[#484f58] uppercase tracking-wider mb-1">Available Variables</p>
          <div className="flex flex-wrap gap-1">
            {['{{message}}', '{{sender}}', '{{sender_number}}', '{{timestamp}}', '{{ai_reply}}', '{{http_response}}'].map(v => (
              <span key={v} className="px-1.5 py-0.5 rounded bg-[#21262d] text-[10px] text-[#8b949e] font-mono">{v}</span>
            ))}
          </div>
        </div>

        <Button variant="danger" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
          Delete Node
        </Button>
      </div>
    </div>
  );
}

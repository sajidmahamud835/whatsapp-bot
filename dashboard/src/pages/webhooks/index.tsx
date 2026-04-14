import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { EmptyState } from '../../components/ui/empty-state';
import { Webhook, Plus, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface WebhookItem { id: string; url: string; events: string[]; enabled: boolean; secret: string; createdAt: string }

export default function Webhooks() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ url: '', events: '*', secret: '' });

  const { data, isLoading } = useQuery({ queryKey: ['webhooks'], queryFn: () => api.get<{ webhooks: WebhookItem[] }>('/webhooks') });

  const createMutation = useMutation({
    mutationFn: (body: { url: string; events: string[]; secret: string }) => api.post('/webhooks', body),
    onSuccess: () => { toast.success('Webhook registered'); setShowAdd(false); setForm({ url: '', events: '*', secret: '' }); queryClient.invalidateQueries({ queryKey: ['webhooks'] }); },
    onError: handleError,
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean; error?: string }>(`/webhooks/${id}/test`),
    onSuccess: (data) => { data.success ? toast.success('Test delivered') : toast.error(data.error || 'Test failed'); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/webhooks/${id}`),
    onSuccess: () => { toast.success('Webhook deleted'); queryClient.invalidateQueries({ queryKey: ['webhooks'] }); },
    onError: handleError,
  });

  const webhooks = data?.webhooks || [];

  return (
    <div>
      <PageHeader title="Webhooks" description={`${webhooks.length} registered webhooks`} actions={
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Webhook</Button>
      } />

      {isLoading ? null : webhooks.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhooks" description="Register webhooks to receive event notifications via HTTP." action={{ label: 'Add Webhook', onClick: () => setShowAdd(true) }} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#30363d]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">URL</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Events</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Status</th>
                <th className="w-24"></th>
              </tr></thead>
              <tbody>
                {webhooks.map(w => (
                  <tr key={w.id} className="border-b border-[#21262d] hover:bg-[#21262d] transition-colors">
                    <td className="px-5 py-3 text-sm text-[#e6edf3] font-mono truncate max-w-xs">{w.url}</td>
                    <td className="px-5 py-3"><div className="flex gap-1 flex-wrap">{w.events.map(e => <Badge key={e} variant="info">{e}</Badge>)}</div></td>
                    <td className="px-5 py-3"><Badge variant={w.enabled ? 'success' : 'neutral'}>{w.enabled ? 'Active' : 'Disabled'}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => testMutation.mutate(w.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Test"><Zap className="h-4 w-4" /></button>
                        <button onClick={() => deleteMutation.mutate(w.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register Webhook">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ url: form.url, events: form.events.split(',').map(s => s.trim()), secret: form.secret }); }} className="space-y-4">
          <Input label="URL" placeholder="https://your-server.com/webhook" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          <Input label="Events" placeholder="* (or message.received,client.connected)" value={form.events} onChange={e => setForm({ ...form, events: e.target.value })} />
          <Input label="Secret (optional)" placeholder="HMAC signing secret" value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!form.url}>Register</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

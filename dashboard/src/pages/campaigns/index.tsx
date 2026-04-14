import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Modal } from '../../components/ui/modal';
import { EmptyState } from '../../components/ui/empty-state';
import { Megaphone, Plus, Trash2, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface Campaign { id: string; name: string; status: string; client_id: string; message: string; audience_data: string[]; stats?: { total: number; sent: number; failed: number } }

const statusVariants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  draft: 'neutral', sending: 'warning', completed: 'success', failed: 'error', paused: 'info',
};

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', client_id: '1', message: '', numbers: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<{ campaigns: Campaign[] }>('/pro/campaigns'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; client_id: string; message: string; audience_data: string[] }) => api.post('/pro/campaigns', { ...body, audience_type: 'numbers' }),
    onSuccess: () => { toast.success('Campaign created'); setShowAdd(false); setForm({ name: '', client_id: '1', message: '', numbers: '' }); queryClient.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: handleError,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/pro/campaigns/${id}/send`),
    onSuccess: () => { toast.success('Campaign sending...'); queryClient.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/campaigns/${id}`),
    onSuccess: () => { toast.success('Campaign deleted'); queryClient.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: handleError,
  });

  const campaigns = data?.campaigns || [];

  return (
    <div>
      <PageHeader title="Campaigns" description={`${campaigns.length} broadcast campaigns`} actions={
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New Campaign</Button>
      } />

      {isLoading ? (
        <Card><CardContent><p className="text-[var(--text-muted)] text-sm py-8 text-center">Loading...</p></CardContent></Card>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns" description="Create broadcast campaigns to message your contacts at scale." action={{ label: 'New Campaign', onClick: () => setShowAdd(true) }} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Recipients</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Delivery</th>
                <th className="w-24"></th>
              </tr></thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[var(--text)]">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-xs">{c.message}</p>
                    </td>
                    <td className="px-5 py-3"><Badge variant={statusVariants[c.status] ?? 'neutral'}>{c.status}</Badge></td>
                    <td className="px-5 py-3 text-sm text-[var(--text-sec)]">{c.audience_data.length}</td>
                    <td className="px-5 py-3 text-sm text-[var(--text-sec)]">
                      {c.stats ? `${c.stats.sent} sent, ${c.stats.failed} failed` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {c.status === 'draft' && (
                          <button onClick={() => sendMutation.mutate(c.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Send now">
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Campaign" size="lg">
        <form onSubmit={e => { e.preventDefault(); const nums = form.numbers.split('\n').map(n => n.trim()).filter(Boolean); createMutation.mutate({ name: form.name, client_id: form.client_id, message: form.message, audience_data: nums }); }} className="space-y-4">
          <Input label="Campaign Name" placeholder="Morning Broadcast" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Client ID" placeholder="1" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} />
          <Textarea label="Message" placeholder="Hello! Here's your daily update..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          <Textarea label="Recipients (one number per line)" placeholder={"8801XXXXXXXXX\n8801YYYYYYYYY"} value={form.numbers} onChange={e => setForm({ ...form, numbers: e.target.value })} />
          <p className="text-xs text-[var(--text-muted)]">{form.numbers.split('\n').filter(n => n.trim()).length} recipients</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!form.name || !form.message || !form.numbers.trim()}>Create Draft</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

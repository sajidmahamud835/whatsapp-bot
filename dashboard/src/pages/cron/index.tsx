import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card } from '../../components/ui/card';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Modal } from '../../components/ui/modal';
import { EmptyState } from '../../components/ui/empty-state';
import { Clock, Play, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface CronJob { id: string; name: string; schedule: string; clientId: string; action: string; params: Record<string, any>; enabled: boolean; lastRun?: string; lastError?: string; runCount: number; isRunning: boolean }

const SCHEDULE_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every day at 6pm', value: '0 18 * * *' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Every 1st of month', value: '0 9 1 * *' },
];

const ACTION_OPTIONS = [
  { value: 'sendMessage', label: 'Send Message', fields: ['to', 'message'] },
  { value: 'broadcast', label: 'Broadcast', fields: ['numbers', 'message'] },
  { value: 'postStatus', label: 'Post Status', fields: ['text'] },
];

function cronToHuman(cron: string): string {
  const presets: Record<string, string> = {
    '* * * * *': 'Every minute', '*/5 * * * *': 'Every 5 min', '*/15 * * * *': 'Every 15 min',
    '*/30 * * * *': 'Every 30 min', '0 * * * *': 'Every hour', '0 */2 * * *': 'Every 2 hours',
    '0 */6 * * *': 'Every 6 hours', '0 */12 * * *': 'Every 12 hours',
    '0 0 * * *': 'Daily at midnight', '0 9 * * *': 'Daily at 9 AM', '0 18 * * *': 'Daily at 6 PM',
    '0 9 * * 1': 'Mon at 9 AM', '0 9 * * 1-5': 'Weekdays at 9 AM',
    '0 9 1 * *': '1st of month at 9 AM',
  };
  return presets[cron] || cron;
}

export default function CronJobs() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [confirmRunId, setConfirmRunId] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', schedule: '0 9 * * *', clientId: '1', action: 'sendMessage', to: '', message: '', numbers: '', text: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['cron'],
    queryFn: () => api.get<{ jobs: CronJob[] }>('/cron'),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const params: Record<string, any> = {};
      if (form.action === 'sendMessage') { params.to = form.to; params.message = form.message; }
      else if (form.action === 'broadcast') { params.numbers = form.numbers.split('\n').map(n => n.trim()).filter(Boolean); params.message = form.message; }
      else if (form.action === 'postStatus') { params.text = form.text; }
      return api.post('/cron', { name: form.name, schedule: form.schedule, clientId: form.clientId, action: form.action, params });
    },
    onSuccess: () => { toast.success('Cron job created'); setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['cron'] }); },
    onError: handleError,
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => api.post(`/cron/${id}/run`),
    onSuccess: () => { toast.success('Job executed'); queryClient.invalidateQueries({ queryKey: ['cron'] }); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/cron/${id}`),
    onSuccess: () => { toast.success('Job deleted'); queryClient.invalidateQueries({ queryKey: ['cron'] }); },
    onError: handleError,
  });

  const jobs = data?.jobs || [];

  return (
    <div>
      <PageHeader title="Cron Jobs" description={`${jobs.length} scheduled jobs`} actions={
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Job</Button>
      } />

      {isLoading ? null : jobs.length === 0 ? (
        <EmptyState icon={Clock} title="No cron jobs" description="Schedule recurring messages, broadcasts, or status updates." action={{ label: 'Create Job', onClick: () => setShowCreate(true) }} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Schedule</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Runs</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-sec)]">Last Run</th>
                <th className="w-24"></th>
              </tr></thead>
              <tbody>{jobs.map(j => (
                <tr key={j.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-[var(--text)]">{j.name}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-[var(--text)]">{cronToHuman(j.schedule)}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{j.schedule}</p>
                  </td>
                  <td className="px-5 py-3"><Badge variant="info">{j.action}</Badge></td>
                  <td className="px-5 py-3">
                    <Badge variant={j.isRunning ? 'success' : j.enabled ? 'warning' : 'neutral'}>
                      {j.isRunning ? 'Running' : j.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    {j.lastError && <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[150px]">{j.lastError}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--text-sec)]">{j.runCount}</td>
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{j.lastRun ? new Date(j.lastRun).toLocaleString() : '—'}</td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => setConfirmRunId({ id: j.id, name: j.name })} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Run now"><Play className="h-4 w-4" /></button>
                    <button onClick={() => setConfirmDeleteId(j.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Cron Job" size="lg">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Job Name" placeholder="Morning Broadcast" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Client ID" placeholder="1" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} />

          {/* Schedule */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text)]">Schedule</label>
            <div className="flex gap-2">
              <Input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="* * * * *" className="flex-1 font-mono" />
              <select onChange={e => { if (e.target.value) setForm({ ...form, schedule: e.target.value }); }} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                <option value="">Presets...</option>
                {SCHEDULE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Cron format: minute hour day-of-month month day-of-week</p>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text)]">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTION_OPTIONS.map(a => (
                <button key={a.value} type="button" onClick={() => setForm({ ...form, action: a.value })}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${form.action === a.value ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-sec)] hover:border-[var(--border-hover)]'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action params */}
          {form.action === 'sendMessage' && (
            <>
              <Input label="To (JID or number)" placeholder="8801XXXXXXXXX@s.whatsapp.net" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
              <Textarea label="Message" placeholder="Hello!" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </>
          )}
          {form.action === 'broadcast' && (
            <>
              <Textarea label="Numbers (one per line)" placeholder={"8801XXXXXXXXX\n8801YYYYYYYYY"} value={form.numbers} onChange={e => setForm({ ...form, numbers: e.target.value })} />
              <Textarea label="Message" placeholder="Hello everyone!" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </>
          )}
          {form.action === 'postStatus' && (
            <Textarea label="Status Text" placeholder="Good morning!" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!form.name || !form.schedule}>Create Job</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmRunId}
        onClose={() => setConfirmRunId(null)}
        onConfirm={() => { if (confirmRunId) runMutation.mutate(confirmRunId.id); }}
        title="Run Job Now?"
        message={`Execute "${confirmRunId?.name}" immediately? This will trigger the action right now.`}
        confirmLabel="Run Now"
        variant="primary"
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId); }}
        title="Delete Cron Job?"
        message="This job will be permanently deleted and will no longer run."
        confirmLabel="Delete"
      />
    </div>
  );
}

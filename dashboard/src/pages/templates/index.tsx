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
import { FileText, Plus, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template { id: string; name: string; category: string; body: string; variables: string[] }

export default function Templates() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', body: '', category: 'general' });

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<{ templates: Template[] }>('/pro/templates'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/pro/templates', body),
    onSuccess: () => { toast.success('Template created'); setShowAdd(false); setForm({ name: '', body: '', category: 'general' }); queryClient.invalidateQueries({ queryKey: ['templates'] }); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/templates/${id}`),
    onSuccess: () => { toast.success('Template deleted'); queryClient.invalidateQueries({ queryKey: ['templates'] }); },
    onError: handleError,
  });

  const templates = data?.templates || [];
  const categories = ['general', 'greeting', 'support', 'sales', 'notification'];

  return (
    <div>
      <PageHeader title="Templates" description={`${templates.length} quick reply templates`} actions={
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New Template</Button>
      } />

      {isLoading ? (
        <Card><CardContent><p className="text-[#484f58] text-sm py-8 text-center">Loading...</p></CardContent></Card>
      ) : templates.length === 0 ? (
        <EmptyState icon={FileText} title="No templates" description="Create quick reply templates to speed up your responses." action={{ label: 'Create Template', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <Card key={t.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#e6edf3]">{t.name}</h3>
                    <Badge variant="info" className="mt-1">{t.category}</Badge>
                  </div>
                  <button onClick={() => deleteMutation.mutate(t.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-[#8b949e] whitespace-pre-wrap line-clamp-3">{t.body}</p>
                {t.variables.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {t.variables.map(v => <Badge key={v} variant="neutral">{`{{${v}}}`}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Template">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Input label="Name" placeholder="Template name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#e6edf3]">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
              {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <Textarea label="Body" placeholder="Hello {{name}}, thanks for contacting us!" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <p className="text-xs text-[#484f58]">Use {'{{variable}}'} for dynamic content</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!form.name || !form.body}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

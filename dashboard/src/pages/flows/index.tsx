import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { EmptyState } from '../../components/ui/empty-state';
import { Workflow, Plus, Trash2, Copy, Pencil, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface BotFlow {
  id: string; name: string; description: string; client_id: string;
  trigger_type: string; enabled: boolean; nodes: any[]; edges: any[];
  created_at: string; updated_at: string;
}

export default function Flows() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', client_id: '1' });

  const { data, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => api.get<{ flows: BotFlow[] }>('/pro/flows'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post<{ flow: BotFlow }>('/pro/flows', {
      ...body,
      nodes: [{ id: 'trigger_1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Message Received' } }],
      edges: [],
    }),
    onSuccess: (res) => {
      toast.success('Flow created');
      setShowCreate(false);
      setForm({ name: '', description: '', client_id: '1' });
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      navigate(`/flows/${res.flow.id}`);
    },
    onError: handleError,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/pro/flows/${id}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['flows'] }); },
    onError: handleError,
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/pro/flows/${id}/duplicate`),
    onSuccess: () => { toast.success('Flow duplicated'); queryClient.invalidateQueries({ queryKey: ['flows'] }); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/flows/${id}`),
    onSuccess: () => { toast.success('Flow deleted'); queryClient.invalidateQueries({ queryKey: ['flows'] }); },
    onError: handleError,
  });

  const flows = data?.flows || [];

  return (
    <div>
      <PageHeader title="Flow Builder" description="Create visual chatbot workflows" actions={
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Flow</Button>
      } />

      {isLoading ? null : flows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No flows yet"
          description="Build your first chatbot flow with our visual drag-and-drop builder."
          action={{ label: 'Create Flow', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map(f => (
            <Card key={f.id} className="hover:border-[#484f58] transition-colors cursor-pointer group" onClick={() => navigate(`/flows/${f.id}`)}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#e6edf3] truncate">{f.name}</h3>
                    {f.description && <p className="text-xs text-[#484f58] mt-0.5 truncate">{f.description}</p>}
                  </div>
                  <Badge variant={f.enabled ? 'success' : 'neutral'}>
                    {f.enabled ? 'Active' : 'Draft'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                  <span>Client {f.client_id}</span>
                  <span>{f.nodes.length} nodes</span>
                  <span>{f.edges.length} connections</span>
                </div>

                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/flows/${f.id}`)} className="p-1.5 rounded-lg text-[#484f58] hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toggleMutation.mutate(f.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title={f.enabled ? 'Disable' : 'Enable'}>
                    {f.enabled ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => duplicateMutation.mutate(f.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Duplicate">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(f.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Flow">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Input label="Flow Name" placeholder="Welcome Bot" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" placeholder="Greets new users and collects their info" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Input label="Client ID" placeholder="1" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!form.name}>Create & Edit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

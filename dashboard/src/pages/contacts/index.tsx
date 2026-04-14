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
import { SearchInput } from '../../components/ui/search-input';
import { EmptyState } from '../../components/ui/empty-state';
import { Users, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Contact { id: string; name: string | null; phone: string; email: string | null; tags: string[]; updated_at: string }

export default function Contacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', email: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => api.get<{ contacts: Contact[]; total: number }>(`/pro/contacts?search=${encodeURIComponent(search)}&limit=100`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/pro/contacts', body),
    onSuccess: () => {
      toast.success('Contact created');
      setShowAdd(false);
      setForm({ phone: '', name: '', email: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/contacts/${id}`),
    onSuccess: () => {
      toast.success('Contact deleted');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: handleError,
  });

  const contacts = data?.contacts || [];

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${data?.total ?? 0} managed contacts`}
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, or email..." />
      </div>

      {isLoading ? (
        <Card><CardContent><p className="text-[#484f58] text-sm py-8 text-center">Loading...</p></CardContent></Card>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start managing your WhatsApp audience."
          action={{ label: 'Add Contact', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Tags</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} className="border-b border-[#21262d] hover:bg-[#21262d] transition-colors">
                    <td className="px-5 py-3 text-sm text-[#e6edf3] font-medium">{c.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-[#8b949e] font-mono">{c.phone}</td>
                    <td className="px-5 py-3 text-sm text-[#8b949e]">{c.email || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {c.tags.map(t => <Badge key={t} variant="info">{t}</Badge>)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Contact Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Contact">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Input label="Phone" placeholder="8801XXXXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Name" placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Textarea label="Notes" placeholder="Optional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!form.phone}>Save Contact</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

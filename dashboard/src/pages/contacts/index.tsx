import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Modal } from '../../components/ui/modal';
import { SearchInput } from '../../components/ui/search-input';
import { EmptyState } from '../../components/ui/empty-state';
import { Users, Plus, Trash2, Pencil, Download, Tag, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface Contact { id: string; name: string | null; phone: string; email: string | null; notes: string | null; tags: string[]; updated_at: string }
interface TagItem { id: string; name: string; color: string; contact_count?: number }

export default function Contacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', email: '', notes: '' });
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, filterTag],
    queryFn: () => api.get<{ contacts: Contact[]; total: number }>(`/pro/contacts?search=${encodeURIComponent(search)}&limit=200${filterTag ? `&tag=${filterTag}` : ''}`),
  });

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<{ tags: TagItem[] }>('/pro/tags'),
  });

  const saveMutation = useMutation({
    mutationFn: (body: typeof form) =>
      editingContact ? api.put(`/pro/contacts/${editingContact.id}`, body) : api.post('/pro/contacts', body),
    onSuccess: () => { toast.success(editingContact ? 'Contact updated' : 'Contact created'); closeModal(); queryClient.invalidateQueries({ queryKey: ['contacts'] }); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/contacts/${id}`),
    onSuccess: () => { toast.success('Contact deleted'); queryClient.invalidateQueries({ queryKey: ['contacts'] }); },
    onError: handleError,
  });

  const importMutation = useMutation({
    mutationFn: (contacts: Array<{ phone: string; name?: string }>) => api.post<{ imported: number; skipped: number }>('/pro/contacts/import', { contacts }),
    onSuccess: (res) => { toast.success(`Imported ${res.imported}, skipped ${res.skipped}`); setShowImport(false); setImportText(''); queryClient.invalidateQueries({ queryKey: ['contacts'] }); },
    onError: handleError,
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => api.post('/pro/tags', { name }),
    onSuccess: () => { toast.success('Tag created'); setNewTagName(''); queryClient.invalidateQueries({ queryKey: ['tags'] }); },
    onError: handleError,
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/tags/${id}`),
    onSuccess: () => { toast.success('Tag deleted'); queryClient.invalidateQueries({ queryKey: ['tags'] }); },
    onError: handleError,
  });

  const contacts = data?.contacts || [];
  const tags = tagsData?.tags || [];

  function openCreate() { setEditingContact(null); setForm({ phone: '', name: '', email: '', notes: '' }); setShowModal(true); }
  function openEdit(c: Contact) { setEditingContact(c); setForm({ phone: c.phone, name: c.name || '', email: c.email || '', notes: c.notes || '' }); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditingContact(null); }

  function handleImport() {
    const lines = importText.trim().split('\n').filter(Boolean);
    const parsed = lines.map(line => { const [phone, name] = line.split(',').map(s => s.trim()); return { phone: phone || '', name }; }).filter(c => c.phone);
    if (parsed.length === 0) { toast.error('No valid contacts'); return; }
    importMutation.mutate(parsed);
  }

  function exportCSV() {
    const rows = ['Name,Phone,Email,Tags', ...contacts.map(c => `"${c.name || ''}","${c.phone}","${c.email || ''}","${c.tags.join('; ')}"`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'contacts.csv'; a.click();
  }

  function toggleSelect(id: string) { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} contacts?`)) return;
    Promise.all([...selectedIds].map(id => api.del(`/pro/contacts/${id}`))).then(() => {
      toast.success(`Deleted ${selectedIds.size} contacts`); setSelectedIds(new Set()); queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }).catch(handleError);
  }

  return (
    <div>
      <PageHeader title="Contacts" description={`${data?.total ?? 0} managed contacts`} actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowTagModal(true)}><Tag className="h-3.5 w-3.5" /> Tags</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}><Upload className="h-3.5 w-3.5" /> Import</Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      } />

      <div className="flex gap-3 mb-4">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone..." /></div>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
          <option value="">All Tags</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name} ({t.contact_count ?? 0})</option>)}
        </select>
        {selectedIds.size > 0 && <Button variant="danger" size="sm" onClick={bulkDelete}><Trash2 className="h-3.5 w-3.5" /> Delete ({selectedIds.size})</Button>}
      </div>

      {isLoading ? <Card><div className="p-8 text-center text-[#484f58] text-sm">Loading...</div></Card>
      : contacts.length === 0 ? <EmptyState icon={Users} title={search ? 'No matches' : 'No contacts'} description={search ? 'Try different search.' : 'Add contacts to manage your audience.'} action={!search ? { label: 'Add Contact', onClick: openCreate } : undefined} />
      : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#30363d]">
                <th className="w-10 px-3 py-3"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(contacts.map(c => c.id)) : new Set())} checked={selectedIds.size === contacts.length && contacts.length > 0} className="rounded border-[#30363d] bg-[#0d1117] accent-emerald-500" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Tags</th>
                <th className="w-20"></th>
              </tr></thead>
              <tbody>{contacts.map(c => (
                <tr key={c.id} className="border-b border-[#21262d] hover:bg-[#21262d] transition-colors">
                  <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-[#30363d] bg-[#0d1117] accent-emerald-500" /></td>
                  <td className="px-4 py-3 text-sm font-medium text-[#e6edf3]">{c.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#8b949e] font-mono">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-[#8b949e]">{c.email || '—'}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 flex-wrap">{c.tags.map(t => <Badge key={t} variant="info">{t}</Badge>)}</div></td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-[#484f58] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(c.id); }} className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={closeModal} title={editingContact ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          <Input label="Phone" placeholder="8801XXXXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Name" placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Textarea label="Notes" placeholder="Notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={saveMutation.isPending} disabled={!form.phone}>{editingContact ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Contacts">
        <div className="space-y-4">
          <p className="text-sm text-[#8b949e]">Paste contacts, one per line: <code className="text-emerald-400">phone,name</code></p>
          <Textarea placeholder={"8801XXXXXXXXX,John Doe\n8801YYYYYYYYY,Jane Smith"} value={importText} onChange={e => setImportText(e.target.value)} className="min-h-[150px] font-mono text-xs" />
          <p className="text-xs text-[#484f58]">{importText.split('\n').filter(l => l.trim()).length} contacts</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImport} isLoading={importMutation.isPending} disabled={!importText.trim()}><Upload className="h-4 w-4" /> Import</Button>
          </div>
        </div>
      </Modal>

      {/* Tag Management Modal */}
      <Modal open={showTagModal} onClose={() => setShowTagModal(false)} title="Manage Tags">
        <div className="space-y-4">
          <form onSubmit={e => { e.preventDefault(); if (newTagName.trim()) createTagMutation.mutate(newTagName.trim()); }} className="flex gap-2">
            <Input placeholder="New tag name" value={newTagName} onChange={e => setNewTagName(e.target.value)} className="flex-1" />
            <Button type="submit" isLoading={createTagMutation.isPending} disabled={!newTagName.trim()}>Add</Button>
          </form>
          {tags.length === 0 ? <p className="text-sm text-[#484f58] text-center py-4">No tags yet</p> : tags.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2">
              <div className="flex items-center gap-2"><Badge variant="info">{t.name}</Badge><span className="text-xs text-[#484f58]">{t.contact_count ?? 0} contacts</span></div>
              <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTagMutation.mutate(t.id); }} className="p-1 rounded text-[#484f58] hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

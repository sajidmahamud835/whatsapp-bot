import { useState, useMemo } from 'react';
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
import { FileText, Plus, Trash2, Send, Pencil, Copy, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template { id: string; name: string; category: string; body: string; variables: string[] }

const CATEGORIES = ['general', 'greeting', 'support', 'sales', 'notification'];

export default function Templates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', body: '', category: 'general' });

  // Send modal
  const [showSend, setShowSend] = useState<Template | null>(null);
  const [sendForm, setSendForm] = useState({ clientId: '1', number: '', variables: {} as Record<string, string> });

  // Preview modal
  const [showPreview, setShowPreview] = useState<Template | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<{ templates: Template[] }>('/pro/templates'),
  });

  const saveMutation = useMutation({
    mutationFn: (body: typeof form) =>
      editingId ? api.put(`/pro/templates/${editingId}`, body) : api.post('/pro/templates', body),
    onSuccess: () => {
      toast.success(editingId ? 'Template updated' : 'Template created');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pro/templates/${id}`),
    onSuccess: () => { toast.success('Template deleted'); queryClient.invalidateQueries({ queryKey: ['templates'] }); },
    onError: handleError,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { templateId: string; clientId: string; number: string; variables: Record<string, string> }) =>
      api.post(`/pro/templates/${data.templateId}/send`, { clientId: data.clientId, number: data.number, variables: data.variables }),
    onSuccess: () => { toast.success('Template sent'); setShowSend(null); },
    onError: handleError,
  });

  const templates = data?.templates || [];

  const filtered = useMemo(() => {
    let result = templates;
    if (filterCat) result = result.filter(t => t.category === filterCat);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(s) || t.body.toLowerCase().includes(s));
    }
    return result;
  }, [templates, filterCat, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', body: '', category: 'general' });
    setShowModal(true);
  }

  function openEdit(t: Template) {
    setEditingId(t.id);
    setForm({ name: t.name, body: t.body, category: t.category });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', body: '', category: 'general' });
  }

  function openSend(t: Template) {
    const vars: Record<string, string> = {};
    t.variables.forEach(v => { vars[v] = ''; });
    setSendForm({ clientId: '1', number: '', variables: vars });
    setShowSend(t);
  }

  function openPreview(t: Template) {
    const vars: Record<string, string> = {};
    t.variables.forEach(v => { vars[v] = v === 'name' ? 'John' : v === 'date' ? new Date().toLocaleDateString() : `[${v}]`; });
    setPreviewVars(vars);
    setShowPreview(t);
  }

  function renderBody(body: string, vars: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] || `{{${key}}}`);
  }

  return (
    <div>
      <PageHeader title="Templates" description={`${templates.length} quick reply templates`} actions={
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Template</Button>
      } />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {isLoading ? (
        <Card><CardContent><p className="text-[#484f58] text-sm py-8 text-center">Loading...</p></CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={search || filterCat ? 'No matches' : 'No templates'} description={search || filterCat ? 'Try different filters.' : 'Create quick reply templates to speed up responses.'} action={!search && !filterCat ? { label: 'Create Template', onClick: openCreate } : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="group hover:border-[#484f58] transition-colors">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#e6edf3] truncate">{t.name}</h3>
                    <Badge variant="info" className="mt-1">{t.category}</Badge>
                  </div>
                </div>

                <p className="text-sm text-[#8b949e] whitespace-pre-wrap line-clamp-3">{t.body}</p>

                {t.variables.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {t.variables.map(v => <Badge key={v} variant="neutral">{`{{${v}}}`}</Badge>)}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-1 pt-1 border-t border-[#21262d]">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-[#484f58] hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openPreview(t)} className="p-1.5 rounded-lg text-[#484f58] hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="Preview">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openSend(t)} className="p-1.5 rounded-lg text-[#484f58] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Send">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { saveMutation.mutate({ ...t, name: `${t.name} (copy)` }); }} className="p-1.5 rounded-lg text-[#484f58] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Duplicate">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id); }} className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={closeModal} title={editingId ? 'Edit Template' : 'New Template'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          <Input label="Name" placeholder="Template name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#e6edf3]">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <Textarea label="Body" placeholder="Hello {{name}}, thanks for contacting us!" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />

          {/* Live preview */}
          {form.body && (
            <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-3">
              <p className="text-[10px] font-semibold text-[#484f58] uppercase tracking-wider mb-1">Preview</p>
              <p className="text-sm text-[#e6edf3] whitespace-pre-wrap">{form.body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => `[${k}]`)}</p>
            </div>
          )}

          <p className="text-xs text-[#484f58]">Use {'{{variable}}'} for dynamic content like {'{{name}}'}, {'{{date}}'}, {'{{order_id}}'}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={saveMutation.isPending} disabled={!form.name || !form.body}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Modal */}
      <Modal open={!!showSend} onClose={() => setShowSend(null)} title={`Send: ${showSend?.name}`}>
        {showSend && (
          <form onSubmit={e => { e.preventDefault(); sendMutation.mutate({ templateId: showSend.id, ...sendForm }); }} className="space-y-4">
            <Input label="Client ID" value={sendForm.clientId} onChange={e => setSendForm({ ...sendForm, clientId: e.target.value })} />
            <Input label="Phone Number" placeholder="8801XXXXXXXXX" value={sendForm.number} onChange={e => setSendForm({ ...sendForm, number: e.target.value })} />

            {showSend.variables.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#e6edf3]">Variables</p>
                {showSend.variables.map(v => (
                  <Input key={v} label={`{{${v}}}`} placeholder={`Value for ${v}`} value={sendForm.variables[v] || ''} onChange={e => setSendForm({ ...sendForm, variables: { ...sendForm.variables, [v]: e.target.value } })} />
                ))}
              </div>
            )}

            {/* Message preview */}
            <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-3">
              <p className="text-[10px] font-semibold text-[#484f58] uppercase tracking-wider mb-1">Will send</p>
              <p className="text-sm text-[#e6edf3] whitespace-pre-wrap">{renderBody(showSend.body, sendForm.variables)}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowSend(null)}>Cancel</Button>
              <Button type="submit" isLoading={sendMutation.isPending} disabled={!sendForm.number}>
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!showPreview} onClose={() => setShowPreview(null)} title={`Preview: ${showPreview?.name}`}>
        {showPreview && (
          <div className="space-y-4">
            {showPreview.variables.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#e6edf3]">Sample Variables</p>
                {showPreview.variables.map(v => (
                  <Input key={v} label={`{{${v}}}`} value={previewVars[v] || ''} onChange={e => setPreviewVars({ ...previewVars, [v]: e.target.value })} />
                ))}
              </div>
            )}

            {/* Phone mockup */}
            <div className="flex justify-center">
              <div className="w-72 rounded-2xl border-2 border-[#30363d] bg-[#0d1117] overflow-hidden">
                <div className="bg-[#1f2937] px-4 py-2 text-xs text-[#8b949e] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  WhatsApp Preview
                </div>
                <div className="p-4 min-h-[120px]">
                  <div className="inline-block max-w-[85%] bg-emerald-600 text-white rounded-2xl rounded-br-sm px-4 py-2 ml-auto">
                    <p className="text-sm whitespace-pre-wrap">{renderBody(showPreview.body, previewVars)}</p>
                    <p className="text-[10px] text-emerald-200 mt-1 text-right">Now</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowPreview(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { formatTime, formatPhone } from '../../lib/utils';
import { SearchInput } from '../../components/ui/search-input';
import { Button } from '../../components/ui/button';
import { StatusDot } from '../../components/ui/status-dot';
import { EmptyState } from '../../components/ui/empty-state';
import { MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client { id: string; isReady: boolean; phone?: string; name?: string }
interface Conversation { jid: string; message_count: number; last_message: string; last_timestamp: number; received: number; sent: number }
interface Message { id: string; jid: string; body: string | null; type: string; timestamp: number; from_me: boolean }

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState('1');
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [number, setNumber] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  });

  const { data: convos } = useQuery({
    queryKey: ['conversations', selectedClient],
    queryFn: () => api.get<{ conversations: Conversation[] }>(`/${selectedClient}/messages/conversations?limit=50`),
    refetchInterval: 5000,
  });

  const { data: msgs } = useQuery({
    queryKey: ['messages', selectedClient, selectedJid],
    queryFn: () => selectedJid ? api.get<{ messages: Message[] }>(`/${selectedClient}/messages/conversation/${encodeURIComponent(selectedJid)}?limit=100`) : null,
    enabled: !!selectedJid,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: { number: string; message: string }) => api.post(`/${selectedClient}/send`, body),
    onSuccess: () => {
      toast.success('Message sent');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: handleError,
  });

  const messages_list = msgs?.messages ? [...msgs.messages].reverse() : [];
  const conversations = convos?.conversations || [];
  const readyClients = (clients || []).filter(c => c.isReady);

  const filteredConvos = search
    ? conversations.filter(c => formatPhone(c.jid).includes(search) || c.last_message?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages_list.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const to = number || (selectedJid ? formatPhone(selectedJid) : '');
    if (!to || !message.trim()) return;
    sendMutation.mutate({ number: to, message: message.trim() });
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Left — Conversation List */}
      <div className="w-72 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] overflow-hidden shrink-0">
        <div className="p-3 border-b border-[var(--border)]">
          <select
            value={selectedClient}
            onChange={e => { setSelectedClient(e.target.value); setSelectedJid(null); }}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {readyClients.length > 0
              ? readyClients.map(c => <option key={c.id} value={c.id}>Client {c.id} — {c.name || c.phone}</option>)
              : (clients || []).map(c => <option key={c.id} value={c.id}>Client {c.id}{c.isReady ? '' : ' (offline)'}</option>)
            }
          </select>
        </div>

        <div className="p-3 border-b border-[var(--border)] space-y-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search conversations..." />
          <button
            onClick={() => { setSelectedJid(null); setNumber(''); setTimeout(() => document.getElementById('new-number')?.focus(), 100); }}
            className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-colors"
          >
            + New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvos.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs text-center py-8">No conversations yet. Click "New Conversation" above.</p>
          ) : filteredConvos.map(c => (
            <button
              key={c.jid}
              onClick={() => { setSelectedJid(c.jid); setNumber(formatPhone(c.jid)); }}
              className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)] ${
                selectedJid === c.jid ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text)] truncate">{formatPhone(c.jid)}</span>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">{formatTime(c.last_timestamp)}</span>
              </div>
              <p className="text-xs text-[var(--text-sec)] mt-0.5 truncate">{c.last_message || '(media)'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right — Chat View */}
      <div className="flex-1 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)]">
          {selectedJid ? (
            <>
              <StatusDot status="online" />
              <span className="font-semibold text-[var(--text)]">{formatPhone(selectedJid)}</span>
            </>
          ) : (
            <span className="text-sm text-[var(--text-sec)]">Select a conversation or compose a new message</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedJid ? (
            messages_list.length > 0 ? (
              <>
                {messages_list.map(m => (
                  <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[65%] rounded-2xl px-4 py-2 ${
                      m.from_me
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-[#30363d] text-[var(--text)] rounded-bl-sm'
                    }`}>
                      <p className="text-sm break-words">{m.body || `[${m.type}]`}</p>
                      <p className={`text-[10px] mt-1 ${m.from_me ? 'text-emerald-200' : 'text-[var(--text-muted)]'}`}>
                        {formatTime(m.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <EmptyState icon={MessageSquare} title="No messages" description="Start the conversation by sending a message below." />
            )
          ) : (
            <EmptyState icon={MessageSquare} title="No conversation selected" description="Pick a conversation from the left or type a number below." />
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)]">
          <input
            id="new-number"
            type="text"
            placeholder="Phone number"
            value={number}
            onChange={e => setNumber(e.target.value)}
            className="w-36 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <Button type="submit" size="md" isLoading={sendMutation.isPending} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

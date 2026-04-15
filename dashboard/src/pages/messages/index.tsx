import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { formatPhone } from '../../lib/utils';
import { SearchInput } from '../../components/ui/search-input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import { MessageSquare, Send, Plus, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client { id: string; isReady: boolean; phone?: string; name?: string }
interface Conversation { jid: string; message_count: number; last_message: string; last_timestamp: number; received: number; sent: number }
interface Message { id: string; jid: string; body: string | null; type: string; timestamp: number; from_me: boolean }

function formatMsgTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMsgDate(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatConvoTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(jid: string): string {
  const num = formatPhone(jid);
  return num.slice(-2).toUpperCase();
}

function getAvatarColor(jid: string): string {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < jid.length; i++) hash = jid.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState('1');
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [number, setNumber] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => api.get<Client[]>('/clients') });

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

  // Filter out protocolMessage junk — only show real messages
  const visibleMessages = useMemo(() => {
    if (!msgs?.messages) return [];
    return [...msgs.messages]
      .filter(m => m.body && m.body.length > 0 && m.type !== 'protocolMessage')
      .reverse();
  }, [msgs?.messages]);

  // Group messages by date for separators
  const messagesWithDates = useMemo(() => {
    const result: Array<{ type: 'date'; date: string } | { type: 'msg'; msg: Message }> = [];
    let lastDate = '';
    for (const m of visibleMessages) {
      const date = formatMsgDate(m.timestamp);
      if (date !== lastDate) {
        result.push({ type: 'date', date });
        lastDate = date;
      }
      result.push({ type: 'msg', msg: m });
    }
    return result;
  }, [visibleMessages]);

  const conversations = convos?.conversations || [];
  const readyClients = (clients || []).filter(c => c.isReady);

  const filteredConvos = search
    ? conversations.filter(c => formatPhone(c.jid).includes(search) || c.last_message?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const to = number || (selectedJid ? formatPhone(selectedJid) : '');
    if (!to || !message.trim()) return;
    sendMutation.mutate({ number: to, message: message.trim() });
  }

  function startNewConvo() {
    setSelectedJid(null);
    setNumber('');
    setTimeout(() => document.getElementById('new-number')?.focus(), 100);
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-3">
      {/* Left — Conversation List */}
      <div className="w-80 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] overflow-hidden shrink-0">
        {/* Client selector */}
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

        {/* Search + New */}
        <div className="p-3 border-b border-[var(--border)] space-y-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search conversations..." />
          <button onClick={startNewConvo} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-xs text-[var(--text-muted)]">No conversations yet</p>
            </div>
          ) : filteredConvos.map(c => (
            <button
              key={c.jid}
              onClick={() => { setSelectedJid(c.jid); setNumber(formatPhone(c.jid)); }}
              className={`w-full text-left px-3 py-3 border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)] flex items-center gap-3 ${
                selectedJid === c.jid ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(c.jid)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {getInitials(c.jid)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text)] truncate">{formatPhone(c.jid)}</span>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">{formatConvoTime(c.last_timestamp)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-[var(--text-sec)] truncate flex-1">{c.last_message || '(media)'}</p>
                  <Badge variant="neutral" className="ml-2 shrink-0 text-[10px] px-1.5 py-0">{c.message_count}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — Chat View */}
      <div className="flex-1 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)]">
          {selectedJid ? (
            <>
              <div className={`w-9 h-9 rounded-full ${getAvatarColor(selectedJid)} flex items-center justify-center text-white text-xs font-bold`}>
                {getInitials(selectedJid)}
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--text)]">{formatPhone(selectedJid)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{visibleMessages.length} messages</p>
              </div>
            </>
          ) : (
            <span className="text-sm text-[var(--text-sec)]">Select a conversation or start a new one</span>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {selectedJid ? (
            visibleMessages.length > 0 ? (
              <div className="space-y-1">
                {messagesWithDates.map((item, i) => {
                  if (item.type === 'date') {
                    return (
                      <div key={`date-${i}`} className="flex justify-center py-3">
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-hover)] text-[10px] font-medium text-[var(--text-muted)]">
                          {item.date}
                        </span>
                      </div>
                    );
                  }

                  const m = item.msg;
                  return (
                    <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div className={`max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        m.from_me
                          ? 'bg-[var(--brand)] text-white rounded-br-md'
                          : 'bg-[var(--bg-hover)] text-[var(--text)] rounded-bl-md'
                      }`}>
                        <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1.5 text-right ${m.from_me ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                          {formatMsgTime(m.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <EmptyState icon={MessageSquare} title="No messages" description="Send the first message below." />
            )
          ) : (
            <EmptyState icon={MessageSquare} title="No conversation selected" description="Pick a conversation from the left or start a new one." />
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          <input
            id="new-number"
            ref={inputRef}
            type="text"
            placeholder="Phone number"
            value={number}
            onChange={e => setNumber(e.target.value)}
            className="w-40 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
          />
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
          />
          <Button type="submit" size="md" isLoading={sendMutation.isPending} disabled={!message.trim()} className="rounded-xl px-4">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { StatCard } from '../../components/ui/stat-card';
import { Button } from '../../components/ui/button';
import { MessageSquare, Users, Bot, Megaphone, Download } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Overview { messagesToday: number; messagesThisWeek: number; messagesThisMonth: number; activeConversations: number; aiReplies: number; totalContacts: number; totalCampaigns: number }

export default function Analytics() {
  const [period, setPeriod] = useState('7d');

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<{ overview: Overview }>('/pro/analytics/overview'),
  });

  const { data: msgData } = useQuery({
    queryKey: ['analytics', 'messages', period],
    queryFn: () => api.get<{ data: Array<{ date: string; received: number; sent: number }> }>(`/pro/analytics/messages?period=${period}`),
  });

  const { data: convoData } = useQuery({
    queryKey: ['analytics', 'conversations', period],
    queryFn: () => api.get<{ conversations: Array<{ jid: string; message_count: number; received: number; sent: number }> }>(`/pro/analytics/conversations?period=${period}&limit=10`),
  });

  const ov = overview?.overview;
  const periods = ['7d', '14d', '30d'];

  return (
    <div>
      <PageHeader title="Analytics" description="Message volume, contacts, and AI performance" actions={
        <a href={`/pro/analytics/export?type=messages&format=csv&period=${period}`} target="_blank">
          <Button variant="secondary" size="sm"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        </a>
      } />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today" value={ov?.messagesToday ?? 0} icon={MessageSquare} />
        <StatCard label="This Week" value={ov?.messagesThisWeek ?? 0} sub={`${ov?.activeConversations ?? 0} active convos`} icon={Users} />
        <StatCard label="AI Replies" value={ov?.aiReplies ?? 0} icon={Bot} />
        <StatCard label="Campaigns" value={ov?.totalCampaigns ?? 0} sub={`${ov?.totalContacts ?? 0} contacts`} icon={Megaphone} />
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {periods.map(p => (
          <Button key={p} size="sm" variant={period === p ? 'primary' : 'secondary'} onClick={() => setPeriod(p)}>
            {p}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message Volume */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Message Volume</h3></CardHeader>
          <CardContent>
            {msgData?.data?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={msgData.data}>
                  <defs>
                    <linearGradient id="asg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#25d366" stopOpacity={0.3}/><stop offset="95%" stopColor="#25d366" stopOpacity={0}/></linearGradient>
                    <linearGradient id="arg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3}/><stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#484f58', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#484f58', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" stroke="#25d366" fill="url(#asg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="received" stroke="#58a6ff" fill="url(#arg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-[var(--text-muted)] text-sm text-center py-12">No data</p>}
            <div className="flex gap-4 mt-2 text-xs text-[var(--text-sec)]">
              <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />Sent</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Received</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Contacts */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Top Contacts</h3></CardHeader>
          <CardContent>
            {convoData?.conversations?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={convoData.conversations.map(c => ({ name: c.jid.replace('@s.whatsapp.net', '').slice(-6), msgs: c.message_count }))} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#484f58', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 12 }} />
                  <Bar dataKey="msgs" fill="#25d366" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-[var(--text-muted)] text-sm text-center py-12">No data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

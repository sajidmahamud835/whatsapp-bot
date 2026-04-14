import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PageHeader } from '../components/layout/page-header';
import { StatCard } from '../components/ui/stat-card';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { StatusDot } from '../components/ui/status-dot';
import { SkeletonCard } from '../components/ui/skeleton';
import { MessageSquare, Bot, Webhook, Smartphone } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBytes } from '../lib/utils';

interface Stats {
  uptimeFormatted: string;
  memory: { heapUsed: number };
  clients: { total: number; ready: number; disconnected: number };
  messages: { received24h: number; sent24h: number; totalStored: number };
  ai: { enabled: boolean; totalConversations: number };
  cron: { totalJobs: number; activeJobs: number };
  webhooks: { registered: number; deliveries24h: number };
}

interface Client { id: string; isReady: boolean; isInitialized: boolean; phone?: string; name?: string }
interface MessageVolume { date: string; received: number; sent: number }

export default function Dashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<{ stats: Stats }>('/stats'),
    refetchInterval: 15000,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  });

  const { data: chartData } = useQuery({
    queryKey: ['analytics', 'messages', '7d'],
    queryFn: () => api.get<{ data: MessageVolume[] }>('/pro/analytics/messages?period=7d'),
  });

  const stats = statsData?.stats;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Server overview and metrics" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Clients Ready" value={`${stats?.clients.ready ?? 0}/${stats?.clients.total ?? 0}`} sub={`${stats?.clients.disconnected ?? 0} offline`} icon={Smartphone} />
        <StatCard label="Messages (24h)" value={(stats?.messages.received24h ?? 0) + (stats?.messages.sent24h ?? 0)} sub={`${stats?.messages.received24h ?? 0} in / ${stats?.messages.sent24h ?? 0} out`} icon={MessageSquare} />
        <StatCard label="AI" value={stats?.ai.enabled ? 'Active' : 'Off'} sub={`${stats?.ai.totalConversations ?? 0} conversations`} icon={Bot} />
        <StatCard label="Webhooks" value={stats?.webhooks.registered ?? 0} sub={`${stats?.webhooks.deliveries24h ?? 0} deliveries`} icon={Webhook} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Message Volume (7 days)</h3></CardHeader>
          <CardContent>
            {chartData?.data?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData.data}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#25d366" stopOpacity={0.3}/><stop offset="95%" stopColor="#25d366" stopOpacity={0}/></linearGradient>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3}/><stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#484f58', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#484f58', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" stroke="#25d366" fill="url(#sg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="received" stroke="#58a6ff" fill="url(#rg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-12">No message data yet</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Clients</h3></CardHeader>
            <CardContent className="space-y-2">
              {(clients || []).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={c.isReady ? 'online' : c.isInitialized ? 'connecting' : 'offline'} />
                    <span className="text-sm text-[var(--text)]">Client {c.id}</span>
                  </div>
                  <Badge variant={c.isReady ? 'success' : 'neutral'}>{c.isReady ? c.name || c.phone || 'Ready' : 'Offline'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">System</h3></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-sec)]">Uptime</span><span className="text-[var(--text)]">{stats?.uptimeFormatted}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-sec)]">Memory</span><span className="text-[var(--text)]">{formatBytes(stats?.memory.heapUsed ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-sec)]">Stored</span><span className="text-[var(--text)]">{stats?.messages.totalStored?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-sec)]">Cron</span><span className="text-[var(--text)]">{stats?.cron.activeJobs}/{stats?.cron.totalJobs} active</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

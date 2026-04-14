import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatBytes } from '../../lib/utils';
import { Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stats {
  uptimeFormatted: string;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  clients: { total: number; ready: number };
  messages: { totalStored: number };
}

// Individual config setting row with inline edit
function ConfigRow({ label, path, value, type = 'text', description }: {
  label: string; path: string; value: string | number | boolean; type?: 'text' | 'number' | 'boolean'; description?: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => { setLocalValue(String(value)); }, [value]);

  const mutation = useMutation({
    mutationFn: (val: unknown) => api.put(`/config/${path}`, { value: val }),
    onSuccess: () => { toast.success(`${label} updated`); setEditing(false); queryClient.invalidateQueries({ queryKey: ['config'] }); },
    onError: handleError,
  });

  function save() {
    let parsed: unknown = localValue;
    if (type === 'number') parsed = Number(localValue);
    if (type === 'boolean') parsed = localValue === 'true';
    mutation.mutate(parsed);
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{path}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            {type === 'boolean' ? (
              <select
                value={localValue}
                onChange={e => setLocalValue(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={type}
                value={localValue}
                onChange={e => setLocalValue(e.target.value)}
                className="w-32 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                onKeyDown={e => e.key === 'Enter' && save()}
              />
            )}
            <Button size="sm" onClick={save} isLoading={mutation.isPending}><Save className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setLocalValue(String(value)); }}>Cancel</Button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] hover:border-emerald-500/50 transition-colors font-mono"
          >
            {String(value) || '(empty)'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<{ stats: Stats }>('/stats'),
    refetchInterval: 15000,
  });

  const { data: configData } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<{ config: Record<string, any> }>('/config'),
  });

  const reloadMutation = useMutation({
    mutationFn: () => api.post('/config/reload'),
    onSuccess: () => { toast.success('Config reloaded from disk'); queryClient.invalidateQueries({ queryKey: ['config'] }); },
    onError: handleError,
  });

  const stats = statsData?.stats;
  const cfg = configData?.config;

  return (
    <div>
      <PageHeader title="Settings" description="Server configuration and system info" actions={
        <Button variant="secondary" onClick={() => reloadMutation.mutate()} isLoading={reloadMutation.isPending}>
          <RefreshCw className="h-4 w-4" /> Reload Config
        </Button>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Info */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">System Info</h3></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-sec)]">Version</span><Badge variant="info">v4.2.0</Badge></div>
            <div className="flex justify-between"><span className="text-[var(--text-sec)]">Uptime</span><span className="text-[var(--text)]">{stats?.uptimeFormatted ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-sec)]">Memory (heap)</span><span className="text-[var(--text)]">{formatBytes(stats?.memory.heapUsed ?? 0)} / {formatBytes(stats?.memory.heapTotal ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-sec)]">Memory (RSS)</span><span className="text-[var(--text)]">{formatBytes(stats?.memory.rss ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-sec)]">Clients</span><span className="text-[var(--text)]">{stats?.clients.ready ?? 0}/{stats?.clients.total ?? 0} ready</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-sec)]">Messages</span><span className="text-[var(--text)]">{stats?.messages.totalStored?.toLocaleString() ?? 0}</span></div>
          </CardContent>
        </Card>

        {/* Server Settings */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Server</h3></CardHeader>
          <CardContent>
            <ConfigRow label="Port" path="server.port" value={cfg?.server?.port ?? 3000} type="number" description="API server port" />
            <ConfigRow label="Host" path="server.host" value={cfg?.server?.host ?? '127.0.0.1'} description="Bind address" />
            <ConfigRow label="Client Slots" path="clients.count" value={cfg?.clients?.count ?? 6} type="number" description="Number of WhatsApp client slots" />
            <ConfigRow label="Reconnect Interval" path="clients.reconnectInterval" value={cfg?.clients?.reconnectInterval ?? 5000} type="number" description="ms between reconnect attempts" />
          </CardContent>
        </Card>

        {/* Logging */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Logging</h3></CardHeader>
          <CardContent>
            <ConfigRow label="Log Level" path="logging.level" value={cfg?.logging?.level ?? 'info'} description="trace, debug, info, warn, error" />
            <ConfigRow label="Console Output" path="logging.console" value={cfg?.logging?.console ?? true} type="boolean" />
            <ConfigRow label="File Output" path="logging.file" value={cfg?.logging?.file ?? true} type="boolean" />
            <ConfigRow label="Redact Numbers" path="logging.redactNumbers" value={cfg?.logging?.redactNumbers ?? true} type="boolean" description="Mask phone numbers in logs" />
            <ConfigRow label="Max Log Files" path="logging.maxFiles" value={cfg?.logging?.maxFiles ?? 30} type="number" />
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Database</h3></CardHeader>
          <CardContent>
            <ConfigRow label="DB Path" path="database.path" value={cfg?.database?.path ?? './data/wa-convo.db'} description="SQLite file location" />
            <ConfigRow label="Retention Days" path="database.retentionDays" value={cfg?.database?.retentionDays ?? 30} type="number" description="Auto-delete records older than N days" />
          </CardContent>
        </Card>

        {/* Deployment */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Deployment</h3></CardHeader>
          <CardContent>
            <ConfigRow label="Mode" path="deployment.mode" value={cfg?.deployment?.mode ?? 'local'} description="local, vps, or cloud" />
            <ConfigRow label="Public URL" path="deployment.publicUrl" value={cfg?.deployment?.publicUrl ?? ''} description="Public-facing URL for webhooks" />
            <ConfigRow label="SSL Enabled" path="deployment.ssl.enabled" value={cfg?.deployment?.ssl?.enabled ?? false} type="boolean" />
          </CardContent>
        </Card>

        {/* Dashboard */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[var(--text)]">Dashboard</h3></CardHeader>
          <CardContent>
            <ConfigRow label="Dashboard Enabled" path="dashboard.enabled" value={cfg?.dashboard?.enabled ?? false} type="boolean" />
            <ConfigRow label="Dashboard Port" path="dashboard.port" value={cfg?.dashboard?.port ?? 3001} type="number" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

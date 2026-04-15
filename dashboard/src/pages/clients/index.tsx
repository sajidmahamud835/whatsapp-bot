import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatusDot } from '../../components/ui/status-dot';
import { Modal } from '../../components/ui/modal';
import { SkeletonCard } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Smartphone, QrCode, LogOut, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client {
  id: string; isInitialized: boolean; isReady: boolean; disconnected: boolean;
  phone?: string; name?: string; qrData?: string | null;
  sessionHealth?: 'good' | 'warning' | 'unknown';
  healthMessage?: string;
}

export default function Clients() {
  const queryClient = useQueryClient();
  const [qrClientId, setQrClientId] = useState<string | null>(null);
  const [resetClientId, setResetClientId] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
    refetchInterval: 5000,
  });

  // Poll the specific client's status for QR data when modal is open
  const { data: qrStatus } = useQuery({
    queryKey: ['client-qr', qrClientId],
    queryFn: () => api.get<Client>(`/${qrClientId}/status`),
    enabled: !!qrClientId,
    refetchInterval: 2000,
  });

  // Auto-close QR modal when client becomes ready
  useEffect(() => {
    if (qrStatus?.isReady && qrClientId) {
      toast.success(`Client ${qrClientId} connected!`);
      setQrClientId(null);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  }, [qrStatus?.isReady, qrClientId, queryClient]);

  const initMutation = useMutation({
    mutationFn: (id: string) => api.post(`/${id}/init`),
    onSuccess: (_data, id) => {
      toast.success('Client initializing...');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Open QR modal after a short delay to let QR generate
      setTimeout(() => setQrClientId(id), 1500);
    },
    onError: handleError,
  });

  const logoutMutation = useMutation({
    mutationFn: (id: string) => api.post(`/${id}/logout`),
    onSuccess: () => { toast.success('Client logged out'); queryClient.invalidateQueries({ queryKey: ['clients'] }); },
    onError: handleError,
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => api.post(`/${id}/reset`),
    onSuccess: (_data, id) => {
      toast.success('Session reset! Scan new QR.');
      setResetClientId(null);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setTimeout(() => setQrClientId(id), 1500);
    },
    onError: handleError,
  });

  // Fetch health status for connected clients
  const clientIds = (clients || []).filter(c => c.isReady).map(c => c.id);
  const healthQueries = useQuery({
    queryKey: ['client-health', clientIds.join(',')],
    queryFn: async () => {
      const results: Record<string, Client> = {};
      for (const id of clientIds) {
        try { results[id] = await api.get<Client>(`/${id}/status`); } catch {}
      }
      return results;
    },
    enabled: clientIds.length > 0,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Clients" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const qrData = qrStatus?.qrData;

  return (
    <div>
      <PageHeader title="Clients" description="Manage WhatsApp client connections" />

      {!clients?.length ? (
        <EmptyState icon={Smartphone} title="No clients" description="No client slots configured. Check server config." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <Card key={c.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={c.isReady ? 'online' : c.isInitialized ? 'connecting' : 'offline'} />
                    <span className="font-semibold text-[var(--text)]">Client {c.id}</span>
                  </div>
                  <Badge variant={c.isReady ? 'success' : c.isInitialized ? 'warning' : 'neutral'}>
                    {c.isReady ? 'Ready' : c.isInitialized ? 'Connecting' : 'Idle'}
                  </Badge>
                </div>

                {c.isReady && (
                  <div className="text-sm text-[var(--text-sec)]">
                    <p className="font-medium">{c.name || 'Unknown'}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{c.phone}</p>
                  </div>
                )}

                {/* Session health warning */}
                {c.isReady && healthQueries.data?.[c.id]?.sessionHealth === 'warning' && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-yellow-400">Encryption Issue Detected</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Messages may not be readable. Click "Reset Session" to fix.</p>
                    </div>
                  </div>
                )}

                {c.isInitialized && !c.isReady && (
                  <p className="text-xs text-[var(--text-muted)]">Waiting for QR scan...</p>
                )}

                <div className="flex gap-2 pt-1">
                  {!c.isInitialized && (
                    <Button size="sm" onClick={() => initMutation.mutate(c.id)} isLoading={initMutation.isPending}>
                      Initialize
                    </Button>
                  )}
                  {c.isInitialized && !c.isReady && (
                    <Button size="sm" variant="secondary" onClick={() => setQrClientId(c.id)}>
                      <QrCode className="h-3.5 w-3.5" /> Scan QR
                    </Button>
                  )}
                  {c.isReady && (
                    <>
                    <Button size="sm" variant="secondary" onClick={() => setResetClientId(c.id)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Reset Session
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { if (confirm(`Logout Client ${c.id}?`)) logoutMutation.mutate(c.id); }} isLoading={logoutMutation.isPending}>
                      <LogOut className="h-3.5 w-3.5" /> Logout
                    </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reset Session Confirm */}
      <ConfirmDialog
        open={!!resetClientId}
        onClose={() => setResetClientId(null)}
        onConfirm={() => { if (resetClientId) resetMutation.mutate(resetClientId); }}
        title="Reset Session?"
        message="This will logout, delete encryption keys, and generate a new QR code. You'll need to scan again from your phone. This fixes 'waiting for this message' errors."
        confirmLabel="Reset & Reconnect"
        variant="primary"
        isLoading={resetMutation.isPending}
      />

      {/* QR Code Modal */}
      <Modal open={!!qrClientId} onClose={() => setQrClientId(null)} title={`Scan QR — Client ${qrClientId}`}>
        <div className="text-center py-4">
          {qrData ? (
            <>
              <div className="inline-block rounded-xl border-2 border-[var(--border)] p-3 bg-white mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`}
                  alt="QR Code"
                  width={280}
                  height={280}
                  className="rounded-lg"
                />
              </div>
              <p className="text-sm text-[var(--text-sec)] mb-1">Open WhatsApp on your phone</p>
              <p className="text-xs text-[var(--text-muted)]">Settings → Linked Devices → Link a Device</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Auto-refreshing... will close when connected
              </div>
            </>
          ) : (
            <div className="py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-hover)] mb-4">
                <QrCode className="h-8 w-8 text-[var(--text-muted)] animate-pulse" />
              </div>
              <p className="text-sm text-[var(--text-sec)]">Generating QR code...</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">This usually takes a few seconds</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

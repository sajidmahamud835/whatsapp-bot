import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatusDot } from '../../components/ui/status-dot';
import { SkeletonCard } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { Smartphone, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client {
  id: string; isInitialized: boolean; isReady: boolean; disconnected: boolean; phone?: string; name?: string;
}

export default function Clients() {
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
    refetchInterval: 5000,
  });

  const initMutation = useMutation({
    mutationFn: (id: string) => api.post(`/${id}/init`),
    onSuccess: () => { toast.success('Client initializing...'); queryClient.invalidateQueries({ queryKey: ['clients'] }); },
    onError: handleError,
  });

  const logoutMutation = useMutation({
    mutationFn: (id: string) => api.post(`/${id}/logout`),
    onSuccess: () => { toast.success('Client logged out'); queryClient.invalidateQueries({ queryKey: ['clients'] }); },
    onError: handleError,
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

  return (
    <div>
      <PageHeader title="Clients" description="Manage WhatsApp client connections" />

      {!clients?.length ? (
        <EmptyState icon={Smartphone} title="No clients" description="No client slots configured." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <Card key={c.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={c.isReady ? 'online' : c.isInitialized ? 'connecting' : 'offline'} />
                    <span className="font-semibold text-[#e6edf3]">Client {c.id}</span>
                  </div>
                  <Badge variant={c.isReady ? 'success' : c.isInitialized ? 'warning' : 'neutral'}>
                    {c.isReady ? 'Ready' : c.isInitialized ? 'Connecting' : 'Idle'}
                  </Badge>
                </div>

                {c.isReady && (
                  <div className="text-sm text-[#8b949e]">
                    <p>{c.name || 'Unknown'}</p>
                    <p className="text-xs text-[#484f58]">{c.phone}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {!c.isInitialized && (
                    <Button size="sm" onClick={() => initMutation.mutate(c.id)} isLoading={initMutation.isPending}>
                      Initialize
                    </Button>
                  )}
                  {c.isInitialized && !c.isReady && (
                    <Button size="sm" variant="secondary" onClick={() => window.open(`/${c.id}/qr`, '_blank')}>
                      <ExternalLink className="h-3.5 w-3.5" /> QR Code
                    </Button>
                  )}
                  {c.isReady && (
                    <Button size="sm" variant="danger" onClick={() => logoutMutation.mutate(c.id)} isLoading={logoutMutation.isPending}>
                      Logout
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

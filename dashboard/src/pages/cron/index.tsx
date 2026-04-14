import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import { Clock, Play, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CronJob { id: string; name: string; schedule: string; clientId: string; action: string; enabled: boolean; lastRun?: string; lastError?: string; runCount: number; isRunning: boolean }

export default function CronJobs() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cron'],
    queryFn: () => api.get<{ jobs: CronJob[] }>('/cron'),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => api.post(`/cron/${id}/run`),
    onSuccess: () => { toast.success('Job executed'); queryClient.invalidateQueries({ queryKey: ['cron'] }); },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/cron/${id}`),
    onSuccess: () => { toast.success('Job deleted'); queryClient.invalidateQueries({ queryKey: ['cron'] }); },
    onError: handleError,
  });

  const jobs = data?.jobs || [];

  return (
    <div>
      <PageHeader title="Cron Jobs" description={`${jobs.length} scheduled jobs`} />

      {isLoading ? null : jobs.length === 0 ? (
        <EmptyState icon={Clock} title="No cron jobs" description="Schedule recurring messages, broadcasts, or status updates." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#30363d]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Schedule</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Runs</th>
                <th className="w-24"></th>
              </tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-b border-[#21262d] hover:bg-[#21262d] transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-[#e6edf3]">{j.name}</td>
                    <td className="px-5 py-3 text-sm text-[#8b949e] font-mono">{j.schedule}</td>
                    <td className="px-5 py-3"><Badge variant="info">{j.action}</Badge></td>
                    <td className="px-5 py-3">
                      <Badge variant={j.isRunning ? 'success' : j.enabled ? 'warning' : 'neutral'}>
                        {j.isRunning ? 'Running' : j.enabled ? 'Scheduled' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#8b949e]">{j.runCount}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => runMutation.mutate(j.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Run now"><Play className="h-4 w-4" /></button>
                        <button onClick={() => deleteMutation.mutate(j.id)} className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

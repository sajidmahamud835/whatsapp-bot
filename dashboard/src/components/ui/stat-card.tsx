import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down';
}

export function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#8b949e]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#e6edf3]">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[#484f58]">{sub}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <Icon className="h-5 w-5 text-emerald-400" />
          </div>
        )}
      </div>
    </Card>
  );
}

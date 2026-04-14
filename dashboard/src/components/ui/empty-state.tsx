import type { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-2xl bg-[#21262d] p-4 mb-4">
        <Icon className="h-10 w-10 text-[#484f58]" />
      </div>
      <h3 className="text-lg font-semibold text-[#e6edf3]">{title}</h3>
      <p className="mt-1 text-sm text-[#8b949e] max-w-sm">{description}</p>
      {action && (
        <Button className="mt-4" onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

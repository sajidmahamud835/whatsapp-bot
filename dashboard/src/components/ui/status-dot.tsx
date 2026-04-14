import { cn } from '../../lib/utils';

const colors = {
  online: 'bg-emerald-400',
  offline: 'bg-[#484f58]',
  connecting: 'bg-yellow-400 animate-pulse',
  error: 'bg-red-400',
};

interface StatusDotProps {
  status: keyof typeof colors;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full', colors[status], className)} />;
}

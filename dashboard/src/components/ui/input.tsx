import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[var(--text)]">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
          error ? 'border-red-500' : 'border-[var(--border)] focus:border-emerald-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

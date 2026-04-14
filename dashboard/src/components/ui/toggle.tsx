import { Switch, Field, Label } from '@headlessui/react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <Field>
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onChange={onChange}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
            enabled ? 'bg-emerald-500' : 'bg-[#30363d]',
          )}
        >
          <span className={cn(
            'inline-block h-4 w-4 rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          )} />
        </Switch>
        {label && <Label className="text-sm text-[var(--text)] cursor-pointer">{label}</Label>}
      </div>
    </Field>
  );
}

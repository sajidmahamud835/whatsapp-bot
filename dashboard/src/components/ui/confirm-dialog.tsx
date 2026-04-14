import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirm', message, confirmLabel = 'Confirm', variant = 'danger', isLoading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--danger)]/10 mb-4">
          <AlertTriangle className="h-6 w-6" style={{ color: variant === 'danger' ? 'var(--danger)' : 'var(--brand)' }} />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--text-sec)] mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

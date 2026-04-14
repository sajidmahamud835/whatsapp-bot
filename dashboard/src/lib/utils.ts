import clsx, { type ClassValue } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | number | Date): string {
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  return format(d, 'MMM d, yyyy');
}

export function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return format(d, 'HH:mm');
  }
  return format(d, 'MMM d');
}

export function formatRelative(date: string | number | Date): string {
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatPhone(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', ' (group)');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes / 1048576) + ' MB';
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

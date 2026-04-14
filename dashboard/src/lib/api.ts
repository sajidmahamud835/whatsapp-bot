import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/auth-store';

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const token = useAuthStore.getState().token;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.message || data.error || `Request failed (${res.status})`;

    if (res.status === 401 || res.status === 403) {
      useAuthStore.getState().logout();
    }

    throw new ApiError(message, res.status);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Show toast on error — used in react-query onError callbacks
export function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Something went wrong';
  toast.error(message);
}

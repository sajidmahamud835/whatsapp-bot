import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { wsManager } from '../lib/ws';
import { useAuthStore } from '../stores/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export { queryClient };

export function Providers({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      wsManager.connect();
      return () => wsManager.disconnect();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#161b22',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#25d366', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f85149', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}

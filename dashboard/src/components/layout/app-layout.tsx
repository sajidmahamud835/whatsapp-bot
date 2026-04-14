import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { Sidebar } from './sidebar';
import { Onboarding } from '../onboarding';

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <Onboarding />
    </div>
  );
}

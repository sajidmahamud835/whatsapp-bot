import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import {
  LayoutDashboard, Smartphone, MessageSquare, Users, FileText,
  Megaphone, Workflow, BarChart3, Webhook, Clock, Bot, Settings, LogOut, ChevronLeft, Sun, Moon,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Smartphone, label: 'Clients' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { type: 'divider' as const, label: 'Pro Features' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/flows', icon: Workflow, label: 'Flow Builder' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { type: 'divider' as const, label: 'System' },
  { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/cron', icon: Clock, label: 'Cron Jobs' },
  { to: '/ai-config', icon: Bot, label: 'AI Config' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-[var(--bg)] border-r border-[var(--border)] transition-all duration-200',
      collapsed ? 'w-16' : 'w-56',
    )}>
      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)]">
        {!collapsed && <span className="text-emerald-400 font-bold text-lg">WA Convo</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[var(--text-sec)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if ('type' in item && item.type === 'divider') {
            return !collapsed ? (
              <p key={i} className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {item.label}
              </p>
            ) : <div key={i} className="my-2 border-t border-[var(--border)]" />;
          }

          const { to, icon: Icon, label } = item as { to: string; icon: typeof LayoutDashboard; label: string };
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-[var(--text-sec)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme + Logout */}
      <div className="px-2 py-3 border-t border-[var(--border)] space-y-1">
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-[var(--text-sec)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-[var(--text-sec)] hover:bg-[var(--bg-hover)] hover:text-red-400 transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

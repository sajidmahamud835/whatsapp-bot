import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MessageSquare } from 'lucide-react';

export default function Login() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      useAuthStore.getState().login(key);
      await api.get('/health');
      navigate('/');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('403')) {
        setError('Invalid API key. Check your key and try again.');
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
        setError('Cannot reach server. Make sure it\'s running.');
      } else {
        setError(msg || 'Connection failed. Check API key and server.');
      }
      useAuthStore.getState().logout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-4">
            <MessageSquare className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">WA Convo Pro</h1>
          <p className="mt-1 text-sm text-[var(--text-sec)]">WhatsApp Automation Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-6 space-y-4">
          <Input
            label="API Key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your API key"
            error={error}
          />
          <Button type="submit" isLoading={loading} disabled={!key} className="w-full">
            Connect
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          API key is configured in your server's config.json
        </p>
      </div>
    </div>
  );
}

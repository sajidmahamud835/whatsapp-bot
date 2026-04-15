import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MessageSquare, Star, ExternalLink, Code2 } from 'lucide-react';

const GITHUB_URL = 'https://github.com/sajidmahamud835/whatsapp-bot';
const VERSION = '4.2.0';

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
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand)]/10 mb-4">
            <MessageSquare className="h-8 w-8" style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">WA Convo</h1>
          <p className="mt-1 text-sm text-[var(--text-sec)]">WhatsApp Automation Platform</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">v{VERSION} — Open Source</p>
        </div>

        {/* Login form */}
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
            Connect to Dashboard
          </Button>
        </form>

        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          Set in <code className="text-[var(--text-sec)]">config.json</code> or <code className="text-[var(--text-sec)]">API_KEY</code> env var
        </p>

        {/* GitHub links */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <Code2 className="h-3.5 w-3.5" /> GitHub
          </a>
          <a href={`${GITHUB_URL}/stargazers`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
            <Star className="h-3.5 w-3.5" /> Star Us
          </a>
          <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> Report Issue
          </a>
        </div>

        <p className="mt-4 text-center text-[10px] text-[var(--text-muted)]">
          Built by <a href="https://github.com/sajidmahamud835" target="_blank" rel="noopener noreferrer" className="text-[var(--text-sec)] hover:text-[var(--brand)] transition-colors">Sajid Mahamud</a>
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleError } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Modal } from '../../components/ui/modal';
import { Bot, Send, Plus, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface AIInfo {
  enabled: boolean;
  defaultProvider: string;
  providers: string[];
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

// Known provider presets
const PROVIDER_PRESETS = [
  { type: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'], defaultModel: 'gpt-4o-mini', baseUrl: '' },
  { type: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'], defaultModel: 'claude-haiku-4-5-20251001', baseUrl: '' },
  { type: 'google', label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'], defaultModel: 'gemini-2.0-flash', baseUrl: '' },
  { type: 'openrouter', label: 'OpenRouter', models: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-8b-instruct'], defaultModel: 'openai/gpt-4o-mini', baseUrl: 'https://openrouter.ai/api/v1' },
  { type: 'ollama', label: 'Ollama (Local)', models: ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi3', 'qwen2'], defaultModel: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
];

export default function AIConfig() {
  const queryClient = useQueryClient();
  const [testMsg, setTestMsg] = useState('');
  const [testReply, setTestReply] = useState('');
  const [testProvider, setTestProvider] = useState('');
  const [prompt, setPrompt] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: '', type: 'openai', apiKey: '', model: '', baseUrl: '' });

  // Settings form
  const [maxTokens, setMaxTokens] = useState(500);
  const [temperature, setTemperature] = useState(0.7);
  const [defaultProvider, setDefaultProvider] = useState('');

  const { data } = useQuery({
    queryKey: ['ai-config'],
    queryFn: () => api.get<AIInfo>('/ai/providers'),
  });

  // Sync form values when data loads
  useEffect(() => {
    if (data) {
      setPrompt(data.systemPrompt || '');
      setMaxTokens(data.maxTokens);
      setTemperature(data.temperature);
      setDefaultProvider(data.defaultProvider);
    }
  }, [data]);

  // Update preset when type changes
  useEffect(() => {
    const preset = PROVIDER_PRESETS.find(p => p.type === providerForm.type);
    if (preset) {
      setProviderForm(f => ({ ...f, model: preset.defaultModel, baseUrl: preset.baseUrl }));
    }
  }, [providerForm.type]);

  const promptMutation = useMutation({
    mutationFn: (p: string) => api.put('/ai/prompt', { prompt: p }),
    onSuccess: () => { toast.success('System prompt updated'); queryClient.invalidateQueries({ queryKey: ['ai-config'] }); },
    onError: handleError,
  });

  const configMutation = useMutation({
    mutationFn: (body: { enabled?: boolean; defaultProvider?: string; maxTokens?: number; temperature?: number }) => api.put('/ai/config', body),
    onSuccess: () => { toast.success('AI settings updated'); queryClient.invalidateQueries({ queryKey: ['ai-config'] }); },
    onError: handleError,
  });

  const addProviderMutation = useMutation({
    mutationFn: async (form: typeof providerForm) => {
      // Save provider to config via config API
      const providerConfig: Record<string, unknown> = {
        type: form.type,
        apiKey: form.apiKey,
        model: form.model,
      };
      if (form.baseUrl) providerConfig.baseUrl = form.baseUrl;
      await api.put(`/config/ai.providers.${form.name}`, { value: providerConfig });
      // Reload AI manager by toggling config
      await api.put('/ai/config', {});
    },
    onSuccess: () => {
      toast.success('Provider added — restart server to activate');
      setShowAddProvider(false);
      setProviderForm({ name: '', type: 'openai', apiKey: '', model: '', baseUrl: '' });
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
    onError: handleError,
  });

  const removeProviderMutation = useMutation({
    mutationFn: async (name: string) => {
      // Set to null to remove
      await api.put(`/config/ai.providers.${name}`, { value: null });
      await api.put('/ai/config', {});
    },
    onSuccess: () => {
      toast.success('Provider removed');
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
    onError: handleError,
  });

  const testMutation = useMutation({
    mutationFn: (body: { message: string; provider?: string }) => api.post<{ response: string }>('/ai/test', body),
    onSuccess: (res) => { setTestReply(res.response); },
    onError: handleError,
  });

  const providers = data?.providers || [];
  const selectedPreset = PROVIDER_PRESETS.find(p => p.type === providerForm.type);

  return (
    <div>
      <PageHeader title="AI Configuration" description="Configure AI providers and auto-reply settings" actions={
        <Button variant={data?.enabled ? 'danger' : 'primary'} onClick={() => configMutation.mutate({ enabled: !data?.enabled })}>
          {data?.enabled ? 'Disable AI' : 'Enable AI'}
        </Button>
      } />

      <div className="space-y-4">
        {/* Provider Cards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e6edf3]">AI Providers</h3>
              <Button size="sm" onClick={() => setShowAddProvider(true)}><Plus className="h-3.5 w-3.5" /> Add Provider</Button>
            </div>
          </CardHeader>
          <CardContent>
            {providers.length === 0 ? (
              <p className="text-sm text-[#484f58] py-4 text-center">No providers configured. Add one to enable AI auto-reply.</p>
            ) : (
              <div className="space-y-3">
                {providers.map(name => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-[#e6edf3]">{name}</p>
                        <p className="text-xs text-[#484f58]">
                          {name === data?.defaultProvider && <Badge variant="success" className="mr-2">Default</Badge>}
                          {PROVIDER_PRESETS.find(p => name.toLowerCase().includes(p.type))?.label || 'Custom'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {name !== data?.defaultProvider && (
                        <Button size="sm" variant="ghost" onClick={() => configMutation.mutate({ defaultProvider: name })}>
                          Set Default
                        </Button>
                      )}
                      <button
                        onClick={() => removeProviderMutation.mutate(name)}
                        className="p-1.5 rounded-lg text-[#484f58] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Generation Settings */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-[#e6edf3]">Generation Settings</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">Max Tokens</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={maxTokens}
                    onChange={e => setMaxTokens(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-sm text-[#e6edf3] w-12 text-right font-mono">{maxTokens}</span>
                </div>
                <p className="text-xs text-[#484f58] mt-1">Maximum response length in tokens</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">Temperature</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-sm text-[#e6edf3] w-12 text-right font-mono">{temperature}</span>
                </div>
                <p className="text-xs text-[#484f58] mt-1">0 = deterministic, 2 = creative</p>
              </div>

              <Button size="sm" onClick={() => configMutation.mutate({ maxTokens, temperature })} isLoading={configMutation.isPending}>
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {/* Test Chat */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-[#e6edf3]">Test Chat</h3></CardHeader>
            <CardContent className="space-y-3">
              {testReply && (
                <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs text-[#484f58] mb-1">AI Response:</p>
                  <p className="text-sm text-[#e6edf3] whitespace-pre-wrap">{testReply}</p>
                </div>
              )}
              {providers.length > 1 && (
                <select
                  value={testProvider}
                  onChange={e => setTestProvider(e.target.value)}
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">Default provider</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <form onSubmit={e => { e.preventDefault(); if (testMsg.trim()) testMutation.mutate({ message: testMsg.trim(), ...(testProvider ? { provider: testProvider } : {}) }); }} className="flex gap-2">
                <input
                  placeholder="Type a test message..."
                  value={testMsg}
                  onChange={e => setTestMsg(e.target.value)}
                  className="flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <Button type="submit" isLoading={testMutation.isPending} disabled={!testMsg.trim() || !data?.enabled}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {!data?.enabled && <p className="text-xs text-yellow-400">Enable AI to test</p>}
            </CardContent>
          </Card>
        </div>

        {/* System Prompt */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-[#e6edf3]">System Prompt</h3></CardHeader>
          <CardContent>
            <Textarea
              placeholder="You are a helpful WhatsApp assistant. Be concise and friendly..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="min-h-[140px] font-mono text-xs"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-[#484f58]">This prompt is prepended to every AI conversation</p>
              <Button size="sm" onClick={() => promptMutation.mutate(prompt)} isLoading={promptMutation.isPending} disabled={prompt === data?.systemPrompt}>
                Save Prompt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Provider Modal */}
      <Modal open={showAddProvider} onClose={() => setShowAddProvider(false)} title="Add AI Provider" size="lg">
        <form onSubmit={e => { e.preventDefault(); addProviderMutation.mutate(providerForm); }} className="space-y-4">
          {/* Provider Type */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#e6edf3]">Provider Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDER_PRESETS.map(p => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => setProviderForm(f => ({ ...f, type: p.type, name: f.name || p.type }))}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                    providerForm.type === p.type
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#484f58]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Provider Name"
            placeholder="e.g. openai, my-claude, local-llama"
            value={providerForm.name}
            onChange={e => setProviderForm(f => ({ ...f, name: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') }))}
          />

          <Input
            label="API Key"
            type="password"
            placeholder={providerForm.type === 'ollama' ? 'ollama (no key needed)' : 'sk-...'}
            value={providerForm.apiKey}
            onChange={e => setProviderForm(f => ({ ...f, apiKey: e.target.value }))}
          />

          {/* Model */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#e6edf3]">Model</label>
            <div className="flex gap-2">
              <select
                value={selectedPreset?.models.includes(providerForm.model) ? providerForm.model : '__custom'}
                onChange={e => {
                  if (e.target.value !== '__custom') setProviderForm(f => ({ ...f, model: e.target.value }));
                }}
                className="flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {selectedPreset?.models.map(m => <option key={m} value={m}>{m}</option>)}
                {!selectedPreset?.models.includes(providerForm.model) && providerForm.model && (
                  <option value="__custom">Custom: {providerForm.model}</option>
                )}
              </select>
              <input
                placeholder="or type custom model"
                value={providerForm.model}
                onChange={e => setProviderForm(f => ({ ...f, model: e.target.value }))}
                className="w-48 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          {/* Base URL (for OpenRouter, Ollama, custom) */}
          {(providerForm.type === 'openrouter' || providerForm.type === 'ollama' || providerForm.baseUrl) && (
            <Input
              label="Base URL"
              placeholder="https://api.example.com/v1"
              value={providerForm.baseUrl}
              onChange={e => setProviderForm(f => ({ ...f, baseUrl: e.target.value }))}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAddProvider(false)}>Cancel</Button>
            <Button type="submit" isLoading={addProviderMutation.isPending} disabled={!providerForm.name || !providerForm.apiKey || !providerForm.model}>
              <Zap className="h-4 w-4" /> Add Provider
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

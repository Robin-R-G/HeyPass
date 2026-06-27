'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { Loader2, CheckCircle, XCircle, ChevronRight, ChevronLeft, Trash2, Power, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface ProviderOption {
  id: string;
  name: string;
  description: string;
  models: { id: string; name: string }[];
}

const PROVIDERS: ProviderOption[] = [
  { id: 'openai', name: 'OpenAI', description: 'GPT models including GPT-4o and GPT-3.5 Turbo', models: [{ id: 'gpt-4o', name: 'GPT-4o' }, { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }, { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }] },
  { id: 'groq', name: 'Groq', description: 'Ultra-fast inference for Llama and Mixtral', models: [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }, { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' }, { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }] },
  { id: 'openrouter', name: 'OpenRouter', description: 'Access multiple providers through one API', models: [{ id: 'openai/gpt-4o', name: 'GPT-4o' }, { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }, { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' }] },
  { id: 'together_ai', name: 'Together AI', description: 'Open-source models with fast inference', models: [{ id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B' }, { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B' }] },
  { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude models for advanced reasoning', models: [{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' }, { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }] },
  { id: 'google', name: 'Google Gemini', description: 'Gemini models with massive context windows', models: [{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }, { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }] },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat and Reasoner models', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }, { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' }] },
  { id: 'xai', name: 'xAI (Grok)', description: 'Grok models from xAI', models: [{ id: 'grok-2', name: 'Grok 2' }, { id: 'grok-2-mini', name: 'Grok 2 Mini' }] },
  { id: 'ollama', name: 'Ollama (Self-hosted)', description: 'Run models locally on your infrastructure', models: [{ id: 'llama3.3:latest', name: 'Llama 3.3' }, { id: 'mistral:latest', name: 'Mistral' }] },
];

export default function AIConfigPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data.data) {
        const c = data.data;
        setProvider(c.provider || '');
        setModel(c.default_model || '');
        setTemperature(c.temperature ?? 0.7);
        setMaxTokens(c.max_tokens ?? 2048);
        setSystemPrompt(c.system_prompt || '');
        setIsEnabled(c.is_enabled || false);
        setConnectionStatus(c.connection_status || 'disconnected');
        setLastError(c.last_error || null);
        setHasExisting(true);
        setApiKey(c.api_key_prefix ? `${c.api_key_prefix}...` : '');
      }
    } catch {
      // Not configured yet
    } finally {
      setLoading(false);
    }
  }

  const selectedProvider = PROVIDERS.find(p => p.id === provider);
  const availableModels = selectedProvider?.models || [];

  async function handleSave() {
    if (!provider) { toast('Please select a provider', 'error'); return; }
    if (!model) { toast('Please select a model', 'error'); return; }
    if (!hasExisting && !apiKey) { toast('API key is required', 'error'); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        provider,
        default_model: model,
        temperature,
        max_tokens: maxTokens,
        system_prompt: systemPrompt || undefined,
        is_enabled: isEnabled,
      };

      if (apiKey && !apiKey.includes('...')) {
        body.api_key = apiKey;
      }

      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Failed to save', 'error');
        return;
      }

      setHasExisting(true);
      toast('Configuration saved', 'success');
      setStep(4);
    } catch {
      toast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch('/api/ai/test', { method: 'POST' });
      const data = await res.json();
      if (data.data?.connected) {
        toast(`Connected! Latency: ${data.data.latency_ms}ms`, 'success');
        setConnectionStatus('connected');
        setLastError(null);
      } else {
        toast(data.data?.error || 'Connection failed', 'error');
        setConnectionStatus('error');
        setLastError(data.data?.error || 'Connection failed');
      }
    } catch {
      toast('Test failed', 'error');
    } finally {
      setTesting(false);
    }
  }

  async function handleToggle() {
    try {
      const res = await fetch('/api/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !isEnabled }),
      });
      if (res.ok) {
        setIsEnabled(!isEnabled);
        toast(isEnabled ? 'AI disabled' : 'AI enabled', 'success');
      }
    } catch {
      toast('Failed to toggle', 'error');
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await fetch('/api/ai/config', { method: 'DELETE' });
      toast('Configuration deleted', 'success');
      setHasExisting(false);
      setProvider('');
      setApiKey('');
      setModel('');
      setStep(1);
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  return (
    <div className="max-w-[700px] mx-auto">
      {/* Progress steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s ? 'bg-[var(--hp-primary)] text-black' : 'bg-white/[0.06] text-[#666]'
            }`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[var(--hp-primary)]' : 'bg-white/[0.06]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Provider */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold mb-2">Choose AI Provider</h2>
          <p className="text-sm text-[#888] mb-6">Select your preferred AI provider. You will use your own API key.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => { setProvider(p.id); setModel(p.models[0]?.id || ''); }}
                className={`text-left p-4 rounded-lg border transition-all ${
                  provider === p.id
                    ? 'border-[var(--hp-primary)] bg-[var(--hp-primary)]/10'
                    : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-[#888] mt-1">{p.description}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={() => provider && setStep(2)} disabled={!provider} className="hp-btn hp-btn-primary flex items-center gap-2">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: API Key */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-bold mb-2">Enter API Key</h2>
          <p className="text-sm text-[#888] mb-6">
            Paste your {selectedProvider?.name} API key. It will be encrypted and stored securely.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={hasExisting ? 'Leave unchanged to keep current key' : 'Paste your API key'}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-[#666] mt-1.5">Your key is encrypted with AES-256-GCM and never exposed in the UI.</p>
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="hp-btn hp-btn-secondary flex items-center gap-2">
              <ChevronLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(3)} disabled={!apiKey} className="hp-btn hp-btn-primary flex items-center gap-2">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Model & Settings */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold mb-2">Configure Model</h2>
          <p className="text-sm text-[#888] mb-6">Select a default model and adjust generation settings.</p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Default Model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]"
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Temperature: {temperature}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[var(--hp-primary)]"
              />
              <div className="flex justify-between text-xs text-[#666] mt-1">
                <span>Precise (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value) || 2048)}
                min={1}
                max={128000}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">System Prompt (Optional)</label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant for event management..."
                rows={4}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)] resize-none"
              />
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)} className="hp-btn hp-btn-secondary flex items-center gap-2">
              <ChevronLeft size={14} /> Back
            </button>
            <div className="flex gap-3">
              <button onClick={handleTest} disabled={testing} className="hp-btn hp-btn-secondary flex items-center gap-2">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Test Connection
              </button>
              <button onClick={() => setStep(4)} className="hp-btn hp-btn-primary flex items-center gap-2">
                Save & Finish <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Summary */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold mb-2">Configuration Summary</h2>
          <p className="text-sm text-[#888] mb-6">Review your AI configuration.</p>

          <div className="hp-glass-card p-5 space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">Status</span>
              <span className={`flex items-center gap-1.5 text-sm font-medium ${connectionStatus === 'connected' ? 'text-green-400' : connectionStatus === 'error' ? 'text-red-400' : 'text-[#888]'}`}>
                {connectionStatus === 'connected' ? <CheckCircle size={14} /> : connectionStatus === 'error' ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error' : 'Not Tested'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">Provider</span>
              <span className="text-sm font-medium">{selectedProvider?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">Model</span>
              <span className="text-sm font-medium">{model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">Temperature</span>
              <span className="text-sm font-medium">{temperature}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">Max Tokens</span>
              <span className="text-sm font-medium">{maxTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">Enabled</span>
              <button
                onClick={handleToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${isEnabled ? 'bg-[var(--hp-primary)]' : 'bg-white/[0.1]'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {lastError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-400">{lastError}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(3)} className="hp-btn hp-btn-secondary flex items-center gap-2">
              <ChevronLeft size={14} /> Edit Settings
            </button>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(true)} className="hp-btn hp-btn-secondary text-yellow-400 flex items-center gap-2">
                Reset
              </button>
              <button onClick={() => setConfirmDelete(true)} className="hp-btn hp-btn-secondary text-red-400 flex items-center gap-2">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Delete AI Configuration"
        message="This will permanently delete your AI configuration, including the encrypted API key. You will need to reconfigure from scratch."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmModal
        open={confirmReset}
        title="Reset Configuration"
        message="This will reset your AI settings to defaults while keeping your API key."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => { setConfirmReset(false); setTemperature(0.7); setMaxTokens(2048); setSystemPrompt(''); toast('Settings reset to defaults', 'success'); }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function Zap(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

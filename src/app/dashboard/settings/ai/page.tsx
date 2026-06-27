'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { StatusBadge } from '@/components/status-badge';
import { CheckCircle, XCircle, RefreshCw, Loader2, Brain, Zap, FileText, BarChart3, ExternalLink, Settings } from 'lucide-react';

interface AIStatus {
  connected: boolean;
  provider: string | null;
  model: string | null;
  is_enabled: boolean;
  last_connection_at: string | null;
  requests_today: number;
  requests_this_month: number;
  avg_latency_ms: number;
  recent_errors: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  together_ai: 'Together AI',
  xai: 'xAI (Grok)',
  anthropic: 'Anthropic Claude',
  google: 'Google Gemini',
  deepseek: 'DeepSeek',
  ollama: 'Ollama',
};

export default function AIOverviewPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const [configRes, usageRes] = await Promise.all([
        fetch('/api/ai/config'),
        fetch('/api/ai/usage?view=stats'),
      ]);

      const configData = await configRes.json();
      const usageData = await usageRes.json();

      const config = configData.data;
      const stats = usageData.data;

      setStatus({
        connected: config?.connection_status === 'connected',
        provider: config?.provider || null,
        model: config?.default_model || null,
        is_enabled: config?.is_enabled || false,
        last_connection_at: config?.last_connection_at || null,
        requests_today: stats?.requests_today || 0,
        requests_this_month: stats?.requests_this_month || 0,
        avg_latency_ms: stats?.avg_latency_ms || 0,
        recent_errors: stats?.recent_errors || 0,
      });
    } catch {
      // AI not configured - show setup prompt
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/ai/test', { method: 'POST' });
      const data = await res.json();
      if (data.data?.connected) {
        toast('Connection verified successfully!', 'success');
      } else {
        toast(data.data?.error || 'Connection failed', 'error');
      }
      fetchStatus();
    } catch {
      toast('Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  if (!status || !status.provider) {
    return (
      <div className="max-w-[600px] mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-[var(--hp-primary)]/10 flex items-center justify-center mx-auto mb-5">
          <Brain size={28} className="text-[var(--hp-primary)]" />
        </div>
        <h2 className="text-xl font-bold mb-2">AI Not Configured</h2>
        <p className="text-sm text-[#888] mb-6">
          Connect your preferred AI provider to unlock intelligent features like content generation, 
          event descriptions, and more. You bring your own API key.
        </p>
        <Link
          href="/dashboard/settings/ai/config"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--hp-primary)] text-black font-semibold rounded-lg text-sm hover:bg-[var(--hp-primary-dark)] transition-colors"
        >
          Set Up AI <ExternalLink size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">AI Overview</h2>
          <p className="text-sm text-[#888]">Your AI connection status and quick actions.</p>
        </div>
        <button onClick={handleVerify} disabled={verifying} className="hp-btn hp-btn-secondary flex items-center gap-2">
          {verifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Verify Connection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Status', value: status.connected ? 'Connected' : 'Disconnected', icon: status.connected ? CheckCircle : XCircle, color: status.connected ? '#10b981' : '#ef4444' },
          { label: 'Requests Today', value: status.requests_today, icon: Zap, color: 'var(--hp-primary)' },
          { label: 'Avg Latency', value: `${status.avg_latency_ms}ms`, icon: BarChart3, color: 'var(--hp-primary)' },
          { label: 'Errors Today', value: status.recent_errors, icon: XCircle, color: status.recent_errors > 0 ? '#ef4444' : '#10b981' },
        ].map(card => (
          <div key={card.label} className="hp-glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-xs text-[#888] uppercase tracking-wide">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="hp-glass-card p-5">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Configuration', href: '/dashboard/settings/ai/config', icon: Settings },
            { label: 'Manage Prompts', href: '/dashboard/settings/ai/prompts', icon: FileText },
            { label: 'View Usage', href: '/dashboard/settings/ai/usage', icon: BarChart3 },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#ccc] hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <action.icon size={14} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="hp-glass-card p-5">
        <h3 className="text-sm font-semibold mb-3">Connection Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#888]">Provider</span>
            <p className="text-white font-medium">{PROVIDER_NAMES[status.provider] || status.provider}</p>
          </div>
          <div>
            <span className="text-[#888]">Model</span>
            <p className="text-white font-medium">{status.model}</p>
          </div>
          <div>
            <span className="text-[#888]">Status</span>
            <p className="text-white font-medium flex items-center gap-2">
              {status.connected ? (
                <><CheckCircle size={14} className="text-green-400" /> Connected</>
              ) : (
                <><XCircle size={14} className="text-red-400" /> Disconnected</>
              )}
            </p>
          </div>
          <div>
            <span className="text-[#888]">Last Verified</span>
            <p className="text-white font-medium">
              {status.last_connection_at ? new Date(status.last_connection_at).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      </div>

      <div className="hp-glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Monthly Usage</h3>
          <span className="text-xs text-[#888]">{status.requests_this_month} requests this month</span>
        </div>
        <div className="w-full bg-white/[0.04] rounded-full h-2">
          <div 
            className="bg-[var(--hp-primary)] h-2 rounded-full transition-all" 
            style={{ width: `${Math.min((status.requests_this_month / 1000) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

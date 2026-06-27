'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { CheckCircle, XCircle, Loader2, Brain, Zap, Clock } from 'lucide-react';

interface SuperAdminAIViewProps {
  clientId: string;
}

interface AIOrgStatus {
  connected: boolean;
  provider: string | null;
  model: string | null;
  last_connection_at: string | null;
  error_status: string | null;
  requests_this_month: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI', groq: 'Groq', openrouter: 'OpenRouter', together_ai: 'Together AI',
  xai: 'xAI', anthropic: 'Claude', google: 'Gemini', deepseek: 'DeepSeek', ollama: 'Ollama',
};

export function SuperAdminAIView({ clientId }: SuperAdminAIViewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AIOrgStatus | null>(null);

  useEffect(() => { fetchStatus(); }, [clientId]);

  async function fetchStatus() {
    try {
      // Super admin reads via the same config endpoint with superadmin policy
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data.data) {
        setStatus({
          connected: data.data.connection_status === 'connected',
          provider: data.data.provider || null,
          model: data.data.default_model || null,
          last_connection_at: data.data.last_connection_at || null,
          error_status: data.data.last_error || null,
          requests_this_month: 0,
        });
      }
    } catch {
      // Not configured
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 size={16} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  if (!status) {
    return (
      <div className="hp-glass-card p-4 text-center">
        <Brain size={20} className="text-[#666] mx-auto mb-2" />
        <p className="text-xs text-[#666]">AI not configured</p>
      </div>
    );
  }

  return (
    <div className="hp-glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-[var(--hp-primary)]" />
        <h4 className="text-sm font-semibold">AI Status</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#888]">Status</span>
          <span className={`flex items-center gap-1 ${status.connected ? 'text-green-400' : 'text-[#888]'}`}>
            {status.connected ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888]">Provider</span>
          <span className="font-medium">{PROVIDER_NAMES[status.provider || ''] || status.provider || 'None'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888]">Model</span>
          <span className="font-medium text-xs font-mono">{status.model || 'None'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888]">Last Verified</span>
          <span className="font-medium">
            {status.last_connection_at ? new Date(status.last_connection_at).toLocaleDateString() : 'Never'}
          </span>
        </div>
        {status.error_status && (
          <div className="p-2 bg-red-500/10 rounded mt-2">
            <p className="text-xs text-red-400">{status.error_status}</p>
          </div>
        )}
        <p className="text-[10px] text-[#666] mt-2 pt-2 border-t border-white/[0.06]">
          API keys and prompt history are not visible to Super Admin.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { Loader2, BarChart3, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface UsageStats {
  provider: string;
  model: string;
  requests_today: number;
  requests_this_month: number;
  total_tokens_today: number;
  total_tokens_this_month: number;
  avg_latency_ms: number;
  recent_errors: number;
  connection_status: string;
}

interface UsageLog {
  id: string;
  provider: string;
  model: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI', groq: 'Groq', openrouter: 'OpenRouter', together_ai: 'Together AI',
  xai: 'xAI', anthropic: 'Claude', google: 'Gemini', deepseek: 'DeepSeek', ollama: 'Ollama',
};

const FEATURE_NAMES: Record<string, string> = {
  event_description: 'Event Description', workshop_description: 'Workshop Description',
  agenda: 'Agenda', speaker_bio: 'Speaker Bio', faq: 'FAQ',
  whatsapp_message: 'WhatsApp Message', email: 'Email', certificate_message: 'Certificate Message',
  event_summary: 'Event Summary', dashboard_insights: 'Dashboard Insights',
  marketing_content: 'Marketing Content',
};

export default function AIUsagePage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [history, setHistory] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => { fetchData(); }, [page]);

  async function fetchData() {
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/ai/usage?view=stats'),
        fetch(`/api/ai/usage?page=${page}&limit=${limit}`),
      ]);

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData.data || null);
      setHistory(historyData.data?.data || []);
      setTotal(historyData.data?.total || 0);
    } catch {
      toast('Failed to load usage data', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold">Usage Dashboard</h2>
        <p className="text-sm text-[#888]">Monitor your AI usage, performance, and costs.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Requests Today', value: stats.requests_today, icon: Zap, color: 'var(--hp-primary)' },
            { label: 'Requests This Month', value: stats.requests_this_month, icon: BarChart3, color: 'var(--hp-primary)' },
            { label: 'Avg Latency', value: `${stats.avg_latency_ms}ms`, icon: Clock, color: stats.avg_latency_ms > 5000 ? '#ef4444' : '#10b981' },
            { label: 'Errors Today', value: stats.recent_errors, icon: AlertTriangle, color: stats.recent_errors > 0 ? '#ef4444' : '#10b981' },
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
      )}

      {stats && (
        <div className="hp-glass-card p-5">
          <h3 className="text-sm font-semibold mb-3">Token Usage</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#888]">Tokens Today</span>
              <p className="text-white font-medium">{stats.total_tokens_today.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[#888]">Tokens This Month</span>
              <p className="text-white font-medium">{stats.total_tokens_this_month.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[#888]">Provider</span>
              <p className="text-white font-medium">{PROVIDER_NAMES[stats.provider] || stats.provider}</p>
            </div>
            <div>
              <span className="text-[#888]">Model</span>
              <p className="text-white font-medium">{stats.model}</p>
            </div>
          </div>
        </div>
      )}

      <div className="hp-glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Recent Requests</h3>
        {history.length === 0 ? (
          <div className="text-center py-8 text-[#666] text-sm">No requests yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-left border-b border-white/[0.06]">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Feature</th>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Tokens</th>
                  <th className="pb-2 font-medium">Latency</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(log => (
                  <tr key={log.id} className="border-b border-white/[0.04]">
                    <td className="py-2.5 text-[#888]">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5">{FEATURE_NAMES[log.feature] || log.feature}</td>
                    <td className="py-2.5 text-[#888] font-mono text-xs">{log.model}</td>
                    <td className="py-2.5">{log.total_tokens.toLocaleString()}</td>
                    <td className="py-2.5">{log.latency_ms}ms</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {log.status === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > limit && (
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="hp-btn hp-btn-secondary text-xs">
              Previous
            </button>
            <span className="text-xs text-[#888]">Page {page} of {Math.ceil(total / limit)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="hp-btn hp-btn-secondary text-xs">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

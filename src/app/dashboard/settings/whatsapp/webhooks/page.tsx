'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { Loader2, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface WebhookLog {
  id: string;
  event_type: string;
  processed: boolean;
  error: string | null;
  created_at: string;
}

export default function WhatsAppWebhooksPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.data?.webhook_url) {
        setLogs([]);
      }
    } catch {
      toast('Failed to load webhook data', 'error');
    } finally {
      setLoading(false);
    }
  }

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '';

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold">Webhook Status</h2>
        <p className="text-sm text-[#888]">Monitor incoming webhook events from Meta.</p>
      </div>

      <div className="hp-glass-card p-6">
        <h3 className="text-sm font-semibold mb-3">Webhook Endpoint</h3>
        <div className="flex gap-2 mb-4">
          <input value={webhookUrl} readOnly className="hp-input font-mono text-xs flex-1" />
          <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast('Copied', 'success'); }} className="hp-btn hp-btn-secondary px-3">Copy</button>
        </div>
        <div className="text-xs text-[#888] flex flex-col gap-1">
          <p>Ensure this URL is configured in your Meta App dashboard under <strong>Webhooks &rarr; Edit Subscription</strong>.</p>
          <p>Subscribe to: <code className="bg-white/[0.06] px-1.5 py-0.5 rounded">messages</code>, <code className="bg-white/[0.06] px-1.5 py-0.5 rounded">message_deliveries</code>, <code className="bg-white/[0.06] px-1.5 py-0.5 rounded">message_reads</code></p>
        </div>
      </div>

      <div className="hp-glass-card p-6">
        <h3 className="text-sm font-semibold mb-3">Recent Webhook Events</h3>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-[#666] text-xs">
            <p>No webhook events recorded yet.</p>
            <p className="mt-1">Events will appear here once Meta starts sending webhooks.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg">
                {log.processed ? (
                  <CheckCircle size={14} className="text-[#10b981]" />
                ) : (
                  <XCircle size={14} className="text-[#ef4444]" />
                )}
                <span className="text-sm">{log.event_type}</span>
                <span className="text-xs text-[#666] ml-auto">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hp-glass-card p-6 bg-[var(--hp-primary)]/[0.04] border-[var(--hp-primary)]/20">
        <h3 className="text-sm font-semibold mb-2 text-[var(--hp-primary)]">Troubleshooting</h3>
        <ul className="text-xs text-[#aaa] flex flex-col gap-1.5 pl-5 list-disc">
          <li>Ensure the Callback URL matches exactly (no trailing slash)</li>
          <li>Verify the Verify Token matches your saved token</li>
          <li>Check that the correct webhook subscriptions are active</li>
          <li>Use Meta&apos;s <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[var(--hp-primary)] underline">Webhook Test Tool <ExternalLink size={10} className="inline" /></a> to send test events</li>
        </ul>
      </div>
    </div>
  );
}

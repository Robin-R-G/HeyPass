'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { Loader2, History, Filter } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
}

export default function WhatsAppLogsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const url = actionFilter !== 'all'
        ? `/api/whatsapp/audit?action=${actionFilter}&limit=50`
        : '/api/whatsapp/audit?limit=50';
      const res = await fetch(url);
      const data = await res.json();
      setLogs(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  }

  const actionLabel = (a: string) => {
    const map: Record<string, string> = {
      'config.save': 'Config Saved',
      'config.verify': 'Connection Verified',
      'template.sync': 'Templates Synced',
      'contact.upsert': 'Contact Added',
      'contact.delete': 'Contact Deleted',
      'message.send': 'Message Sent',
      'broadcast.create': 'Broadcast Created',
      'broadcast.send': 'Broadcast Sent',
      'webhook.received': 'Webhook Received',
    };
    return map[a] || a;
  };

  const actionColor = (a: string) => {
    if (a.includes('delete')) return 'text-[#ef4444]';
    if (a.includes('send') || a.includes('broadcast.send')) return 'text-[#10b981]';
    if (a.includes('verify') || a.includes('save')) return 'text-[#FCA311]';
    return 'text-[#888]';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Connection Logs</h2>
          <p className="text-sm text-[#888]">Audit trail for WhatsApp configuration changes and actions.</p>
        </div>
        <button onClick={fetchLogs} className="hp-btn hp-btn-secondary flex items-center gap-2">
          <Loader2 size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-3">
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); }} className="hp-input w-auto">
          <option value="all">All Actions</option>
          <option value="config.save">Config Save</option>
          <option value="config.verify">Verify</option>
          <option value="template.sync">Template Sync</option>
          <option value="contact.upsert">Contact Add</option>
          <option value="message.send">Message Send</option>
          <option value="broadcast.create">Broadcast Create</option>
          <option value="broadcast.send">Broadcast Send</option>
          <option value="webhook.received">Webhook</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="text-[#FCA311] animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-[#666]">
          <History size={32} className="mx-auto mb-3 text-[#444]" />
          <p className="text-sm">No audit logs found.</p>
          <p className="text-xs mt-1">Logs will appear as you use WhatsApp features.</p>
        </div>
      ) : (
        <div className="hp-glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Action</th>
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Resource</th>
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Details</th>
                <th className="text-right px-4 py-3 text-xs text-[#888] font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${actionColor(log.action)}`}>{actionLabel(log.action)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888]">
                    {log.resource_type || '-'}
                    {log.resource_id && <span className="text-[#555] ml-1">({log.resource_id.slice(0, 8)}...)</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#666] max-w-[200px] truncate">
                    {Object.keys(log.details || {}).length > 0 ? JSON.stringify(log.details) : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#666] text-right whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

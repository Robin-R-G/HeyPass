'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { Loader2, RefreshCw, Search, Plus, CheckCircle, XCircle, Clock, Trash2, FileText } from 'lucide-react';

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected' | 'disabled';
  body_text: string;
  header_text: string | null;
  footer_text: string | null;
  buttons: unknown[];
  variables: unknown[];
  last_synced_at: string | null;
}

export default function WhatsAppTemplatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();
      setTemplates(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/templates', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast(`Synced ${Array.isArray(data.data) ? data.data.length : 0} templates`, 'success');
        fetchTemplates();
      } else {
        toast(data.error || 'Sync failed', 'error');
      }
    } catch {
      toast('Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.body_text?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && t.status !== filter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Templates</h2>
          <p className="text-sm text-[#888]">Manage WhatsApp message templates synced from Meta.</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="hp-btn hp-btn-primary flex items-center gap-2">
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync from Meta
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="hp-input pl-9"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="hp-input w-auto">
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="text-[#FCA311] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates found"
          description="Sync from Meta to import your approved WhatsApp templates."
          action={{ label: 'Sync from Meta', onClick: handleSync, icon: RefreshCw }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(tpl => (
            <div key={tpl.id} className="hp-glass-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{tpl.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#888]">{tpl.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#888]">{tpl.language}</span>
                  </div>
                  {tpl.header_text && <p className="text-xs text-[#aaa] mb-1">Header: {tpl.header_text}</p>}
                  <p className="text-xs text-[#888] line-clamp-2">{tpl.body_text}</p>
                  {tpl.footer_text && <p className="text-xs text-[#666] mt-1">Footer: {tpl.footer_text}</p>}
                </div>
                <StatusBadge status={tpl.status} />
              </div>
              {tpl.last_synced_at && (
                <p className="text-[10px] text-[#555] mt-2">Last synced: {new Date(tpl.last_synced_at).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

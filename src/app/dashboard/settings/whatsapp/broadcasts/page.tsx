'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { Loader2, Plus, Send, Trash2, Clock, CheckCircle, XCircle, Radio } from 'lucide-react';

interface Broadcast {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  target_type: string;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at: string | null;
  created_at: string;
}

export default function WhatsAppBroadcastsPage() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; status: string }[]>([]);
  const [form, setForm] = useState({ name: '', template_id: '', scheduled_at: '' });

  useEffect(() => {
    fetchBroadcasts();
    fetch('/api/whatsapp/templates').then(r => r.json()).then(d => {
      setTemplates(Array.isArray(d.data) ? d.data.filter((t: { status: string }) => t.status === 'approved') : []);
    }).catch(() => {});
  }, []);

  async function fetchBroadcasts() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/broadcasts');
      const data = await res.json();
      setBroadcasts(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast('Failed to load broadcasts', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name || !form.template_id) { toast('Name and template required', 'error'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/whatsapp/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          template_id: form.template_id,
          target_type: 'all',
          scheduled_at: form.scheduled_at || null,
        }),
      });
      if (res.ok) {
        toast('Broadcast created', 'success');
        setShowCreate(false);
        setForm({ name: '', template_id: '', scheduled_at: '' });
        fetchBroadcasts();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to create', 'error');
      }
    } catch {
      toast('Failed to create', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(id: string) {
    const confirmed = await confirm({
      title: 'Send Broadcast',
      description: 'Send this broadcast to all contacts now?',
      variant: 'default',
      confirmLabel: 'Send Now',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${id}`, { method: 'POST' });
      if (res.ok) {
        toast('Broadcast sending!', 'success');
        fetchBroadcasts();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to send', 'error');
      }
    } catch {
      toast('Failed to send', 'error');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete Broadcast',
      description: 'Are you sure you want to delete this broadcast? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${id}`, { method: 'DELETE' });
      if (res.ok) { toast('Deleted', 'success'); fetchBroadcasts(); }
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Broadcasts</h2>
          <p className="text-sm text-[#888]">Create and manage bulk message broadcasts.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="hp-btn hp-btn-primary flex items-center gap-2">
          <Plus size={14} /> New Broadcast
        </button>
      </div>

      {showCreate && (
        <div className="hp-glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Create Broadcast</h3>
          <div className="flex flex-col gap-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Broadcast name" className="hp-input" />
            <select value={form.template_id} onChange={e => setForm({...form, template_id: e.target.value})} className="hp-input">
              <option value="">Select template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} className="hp-input" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating} className="hp-btn hp-btn-primary">
                {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)} className="hp-btn hp-btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>
      ) : broadcasts.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No broadcasts yet"
          description="Create a broadcast to send bulk messages to your contacts."
          action={{ label: 'New Broadcast', onClick: () => setShowCreate(true), icon: Plus }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {broadcasts.map(b => (
            <div key={b.id} className="hp-glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{b.name}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-xs text-[#888]">
                    {b.total_contacts} contacts &middot; {b.sent_count} sent &middot; {b.delivered_count} delivered &middot; {b.failed_count} failed
                  </div>
                  {b.scheduled_at && (
                    <div className="text-xs text-[var(--hp-primary)] mt-1 flex items-center gap-1">
                      <Clock size={10} /> Scheduled: {new Date(b.scheduled_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(b.status === 'draft' || b.status === 'scheduled') && (
                    <button onClick={() => handleSend(b.id)} className="p-1.5 text-[#10b981] hover:bg-[#10b981]/10 rounded"><Send size={14} /></button>
                  )}
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 text-[#666] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

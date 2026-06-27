'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { StatusBadge } from '@/components/status-badge';
import { CheckCircle, XCircle, RefreshCw, Loader2, MessageCircle, Users, Radio, FileText, ExternalLink } from 'lucide-react';

interface WhatsAppStatus {
  connected: boolean;
  business_name: string | null;
  phone_number: string | null;
  messaging_limit_tier: string;
  daily_limit: number;
  messages_sent_today: number;
  last_sync_at: string | null;
  templates_count: number;
  contacts_count: number;
  broadcasts_count: number;
}

export default function WhatsAppOverviewPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      const config = data.data;
      if (config) {
        setStatus({
          connected: config.connection_status === 'connected',
          business_name: config.business_name,
          phone_number: config.business_phone,
          messaging_limit_tier: config.messaging_limit_tier || 'restricted',
          daily_limit: config.daily_limit || 250,
          messages_sent_today: config.messages_sent_today || 0,
          last_sync_at: config.last_sync_at,
          templates_count: 0,
          contacts_count: 0,
          broadcasts_count: 0,
        });
        // Fetch counts
        const [tpl, contacts, broadcasts] = await Promise.all([
          fetch('/api/whatsapp/templates').then(r => r.json()).catch(() => ({ data: [] })),
          fetch('/api/whatsapp/contacts?limit=1').then(r => r.json()).catch(() => ({ data: { total: 0 } })),
          fetch('/api/whatsapp/broadcasts').then(r => r.json()).catch(() => ({ data: [] })),
        ]);
        setStatus(prev => prev ? {
          ...prev,
          templates_count: Array.isArray(tpl.data) ? tpl.data.length : 0,
          contacts_count: contacts.data?.total || (Array.isArray(contacts.data) ? contacts.data.length : 0),
          broadcasts_count: Array.isArray(broadcasts.data) ? broadcasts.data.length : 0,
        } : null);
      }
    } catch {
      toast('Failed to load WhatsApp status', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/whatsapp/verify', { method: 'POST' });
      const data = await res.json();
      if (data.data?.status === 'connected') {
        toast('Connection verified!', 'success');
      } else {
        toast('Connection failed', 'error');
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

  if (!status || !status.connected) {
    return (
      <div className="max-w-[600px] mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-[var(--hp-primary)]/10 flex items-center justify-center mx-auto mb-5">
          <MessageCircle size={28} className="text-[var(--hp-primary)]" />
        </div>
        <h2 className="text-xl font-bold mb-2">WhatsApp Not Connected</h2>
        <p className="text-sm text-[#888] mb-6">
          Connect your Meta WhatsApp Business Account to enable messaging, contacts, and broadcasts.
        </p>
        <Link
          href="/dashboard/settings/whatsapp/config"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--hp-primary)] text-black font-semibold rounded-lg text-sm hover:bg-[var(--hp-primary-dark)] transition-colors"
        >
          Connect WhatsApp <ExternalLink size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Overview</h2>
          <p className="text-sm text-[#888]">WhatsApp Business connection status and quick actions.</p>
        </div>
        <button onClick={handleVerify} disabled={verifying} className="hp-btn hp-btn-secondary flex items-center gap-2">
          {verifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Verify Connection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Status', value: status.connected ? 'Connected' : 'Disconnected', icon: status.connected ? CheckCircle : XCircle, color: status.connected ? '#10b981' : '#ef4444' },
          { label: 'Templates', value: status.templates_count, icon: FileText, color: 'var(--hp-primary)', href: '/dashboard/settings/whatsapp/templates' },
          { label: 'Contacts', value: status.contacts_count, icon: Users, color: 'var(--hp-primary)', href: '/dashboard/settings/whatsapp/contacts' },
          { label: 'Broadcasts', value: status.broadcasts_count, icon: Radio, color: 'var(--hp-primary)', href: '/dashboard/settings/whatsapp/broadcasts' },
        ].map(card => (
          <div key={card.label} className="hp-glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-xs text-[#888] uppercase tracking-wide">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.href && <Link href={card.href} className="text-xs text-[var(--hp-primary)] mt-1 inline-block hover:underline">View &rarr;</Link>}
          </div>
        ))}
      </div>

      <div className="hp-glass-card p-5">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Connection Settings', href: '/dashboard/settings/whatsapp/config', icon: ExternalLink },
            { label: 'Manage Templates', href: '/dashboard/settings/whatsapp/templates', icon: FileText },
            { label: 'View Contacts', href: '/dashboard/settings/whatsapp/contacts', icon: Users },
            { label: 'Conversation Inbox', href: '/dashboard/settings/whatsapp/inbox', icon: MessageCircle },
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
        <h3 className="text-sm font-semibold mb-3">Account Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#888]">Business Name</span>
            <p className="text-white font-medium">{status.business_name || 'Not set'}</p>
          </div>
          <div>
            <span className="text-[#888]">Phone Number</span>
            <p className="text-white font-medium">{status.phone_number || 'Not set'}</p>
          </div>
          <div>
            <span className="text-[#888]">Messaging Limit</span>
            <p className="text-white font-medium">{status.daily_limit} messages/day ({status.messaging_limit_tier})</p>
          </div>
          <div>
            <span className="text-[#888]">Last Sync</span>
            <p className="text-white font-medium">{status.last_sync_at ? new Date(status.last_sync_at).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

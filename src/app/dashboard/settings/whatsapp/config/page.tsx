'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { Eye, EyeOff, Copy, RefreshCw, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function WhatsAppConfigPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [form, setForm] = useState({
    business_name: '',
    business_phone: '',
    phone_number_id: '',
    business_account_id: '',
    meta_app_id: '',
    meta_app_secret: '',
    access_token: '',
    webhook_verify_token: '',
    default_sender_name: '',
    default_country_code: '+91',
    timezone: 'Asia/Kolkata',
    template_language: 'en',
  });

  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.data) {
        const c = data.data;
        setForm({
          business_name: c.business_name || '',
          business_phone: c.business_phone || '',
          phone_number_id: c.phone_number_id || '',
          business_account_id: c.business_account_id || '',
          meta_app_id: c.meta_app_id || '',
          meta_app_secret: c.meta_app_secret_encrypted || '',
          access_token: c.access_token_encrypted || '',
          webhook_verify_token: c.webhook_verify_token || '',
          default_sender_name: c.default_sender_name || '',
          default_country_code: c.default_country_code || '+91',
          timezone: c.timezone || 'Asia/Kolkata',
          template_language: c.template_language || 'en',
        });
        setConnectionStatus(c.connection_status || 'disconnected');
      }
    } catch {
      toast('Failed to load config', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.access_token === '***') delete payload.access_token;
      if (form.meta_app_secret === '***') delete payload.meta_app_secret;
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast('Configuration saved', 'success');
        fetchConfig();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/whatsapp/verify', { method: 'POST' });
      const data = await res.json();
      setConnectionStatus(data.data?.status || 'error');
      if (data.data?.status === 'connected') {
        toast('WhatsApp connected!', 'success');
      } else {
        toast('Connection failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch {
      toast('Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied', 'success');
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '';

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-[720px]">
      <div>
        <h2 className="text-lg font-bold">Connection Settings</h2>
        <p className="text-sm text-[#888]">Configure your Meta WhatsApp Business API credentials.</p>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border flex items-center gap-3 ${
        connectionStatus === 'connected'
          ? 'bg-[#10b981]/10 border-[#10b981]/30'
          : 'bg-[#ef4444]/10 border-[#ef4444]/30'
      }`}>
        {connectionStatus === 'connected' ? (
          <CheckCircle size={18} className="text-[#10b981]" />
        ) : (
          <XCircle size={18} className="text-[#ef4444]" />
        )}
        <span className="text-sm font-medium">
          {connectionStatus === 'connected' ? 'Connected to Meta WhatsApp Business' : 'Not connected'}
        </span>
      </div>

      {/* Business Info */}
      <div className="hp-glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Business Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Business Name</label>
            <input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} className="hp-input" placeholder="My Company" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Business Phone</label>
            <input value={form.business_phone} onChange={e => setForm({...form, business_phone: e.target.value})} className="hp-input" placeholder="+919876543210" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Default Sender Name</label>
            <input value={form.default_sender_name} onChange={e => setForm({...form, default_sender_name: e.target.value})} className="hp-input" placeholder="My Business" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Country Code</label>
            <input value={form.default_country_code} onChange={e => setForm({...form, default_country_code: e.target.value})} className="hp-input" placeholder="+91" />
          </div>
        </div>
      </div>

      {/* Meta Credentials */}
      <div className="hp-glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Meta API Credentials</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Phone Number ID</label>
            <input value={form.phone_number_id} onChange={e => setForm({...form, phone_number_id: e.target.value})} className="hp-input font-mono" placeholder="123456789012345" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">WhatsApp Business Account ID (WABA ID)</label>
            <input value={form.business_account_id} onChange={e => setForm({...form, business_account_id: e.target.value})} className="hp-input font-mono" placeholder="123456789012345" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Meta App ID</label>
            <input value={form.meta_app_id} onChange={e => setForm({...form, meta_app_id: e.target.value})} className="hp-input font-mono" placeholder="123456789012345" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Meta App Secret</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={form.meta_app_secret}
                  onChange={e => setForm({...form, meta_app_secret: e.target.value})}
                  className="hp-input pr-10 font-mono"
                  placeholder="********"
                />
                <button onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-white">
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Permanent Access Token</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.access_token}
                  onChange={e => setForm({...form, access_token: e.target.value})}
                  className="hp-input pr-10 font-mono"
                  placeholder="EAAx..."
                />
                <button onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-white">
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={saving} className="hp-btn hp-btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Configuration'}
          </button>
          <button onClick={handleVerify} disabled={verifying} className="hp-btn hp-btn-secondary">
            {verifying ? <><Loader2 size={14} className="animate-spin" /> Verifying...</> : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Webhook Config */}
      <div className="hp-glass-card p-6">
        <h3 className="text-sm font-semibold mb-1">Webhook Configuration</h3>
        <p className="text-xs text-[#888] mb-4">Configure this in your Meta App dashboard.</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Callback URL</label>
            <div className="flex gap-2">
              <input value={webhookUrl} readOnly className="hp-input font-mono text-[var(--hp-primary)] text-xs" />
              <button onClick={() => copyToClipboard(webhookUrl)} className="hp-btn hp-btn-secondary px-3"><Copy size={14} /></button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1.5">Verify Token</label>
            <div className="flex gap-2">
              <input value={form.webhook_verify_token} readOnly className="hp-input font-mono text-xs" />
              <button onClick={() => copyToClipboard(form.webhook_verify_token)} className="hp-btn hp-btn-secondary px-3"><Copy size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="hp-glass-card p-6 bg-[var(--hp-primary)]/[0.04] border-[var(--hp-primary)]/20">
        <h3 className="text-sm font-semibold mb-3 text-[var(--hp-primary)]">Setup Guide</h3>
        <ol className="text-xs text-[#aaa] flex flex-col gap-2 pl-5 list-decimal">
          <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[var(--hp-primary)] underline">Meta Developer Portal <ExternalLink size={10} className="inline" /></a></li>
          <li>Create or open your WhatsApp Business App</li>
          <li>Note your Phone Number ID and WABA ID from <strong>WhatsApp &rarr; Configuration</strong></li>
          <li>Generate a Permanent Access Token</li>
          <li>Enter credentials above and click <strong>Test Connection</strong></li>
          <li>Set the Callback URL and Verify Token in <strong>Webhooks &rarr; Edit Subscription</strong></li>
          <li>Subscribe to: <strong>messages</strong>, <strong>message_deliveries</strong>, <strong>message_reads</strong></li>
        </ol>
      </div>
    </div>
  );
}

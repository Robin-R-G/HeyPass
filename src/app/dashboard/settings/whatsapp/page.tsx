'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { CheckCircle, XCircle, RefreshCw, Eye, EyeOff, Copy, ExternalLink, Loader2 } from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [creds, setCreds] = useState<{
    api_token: string;
    phone_number_id: string;
    waba_id: string;
    webhook_verify_token: string;
    is_connected: boolean;
    last_verified_at: string | null;
  } | null>(null);

  const [form, setForm] = useState({
    api_token: '',
    phone_number_id: '',
    waba_id: '',
  });

  useEffect(() => {
    fetchCredentials();
  }, []);

  async function fetchCredentials() {
    try {
      const res = await fetch('/api/whatsapp/credentials');
      const data = await res.json();
      if (data.data?.credentials) {
        setCreds(data.data.credentials);
        setForm({
          api_token: data.data.credentials.api_token || '',
          phone_number_id: data.data.credentials.phone_number_id || '',
          waba_id: data.data.credentials.waba_id || '',
        });
      }
    } catch {
      toast('Failed to load credentials', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: form.api_token || null,
          phone_number_id: form.phone_number_id || null,
          waba_id: form.waba_id || null,
        }),
      });
      if (res.ok) {
        toast('Credentials saved', 'success');
        fetchCredentials();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save credentials', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/whatsapp/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const data = await res.json();
      if (data.data?.connected) {
        toast('WhatsApp connected successfully!', 'success');
      } else {
        toast('Connection failed. Check your credentials.', 'error');
      }
      fetchCredentials();
    } catch {
      toast('Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResetWebhookToken() {
    try {
      const res = await fetch('/api/whatsapp/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_webhook_token' }),
      });
      const data = await res.json();
      if (data.data?.webhook_verify_token) {
        setCreds(prev => prev ? { ...prev, webhook_verify_token: data.data.webhook_verify_token } : null);
        toast('Webhook token regenerated', 'success');
      }
    } catch {
      toast('Failed to reset token', 'error');
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : '';

  return (
    <div className="min-h-screen text-white font-sans antialiased">
      <nav className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-[rgba(20,33,61,0.6)]">
        <button onClick={() => router.back()} className="text-sm text-[#ccc] hover:text-white transition-colors">&larr; Back</button>
        <span className="text-[#666]">/</span>
        <Link href="/dashboard" className="text-sm text-[#ccc] hover:text-white no-underline transition-colors">Settings</Link>
        <span className="text-[#666]">/</span>
        <span className="text-sm text-white font-medium">WhatsApp</span>
      </nav>

      <div className="max-w-[720px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">WhatsApp Integration</h1>
        <p className="text-sm text-[#888] mb-8">
          Connect your Meta WhatsApp Business Account to enable automated messaging and shared inbox.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="text-[#FCA311] animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Connection Status */}
            <div className="hp-glass-card p-6">
              <div className="flex items-center gap-3 mb-1.5">
                {creds?.is_connected ? (
                  <CheckCircle size={20} className="text-[#10b981]" />
                ) : (
                  <XCircle size={20} className="text-[#ef4444]" />
                )}
                <span className="text-base font-semibold">
                  {creds?.is_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {creds?.last_verified_at && (
                <p className="text-xs text-[#666] ml-[32px]">
                  Last verified: {new Date(creds.last_verified_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* Credentials Form */}
            <div className="hp-glass-card p-6">
              <h2 className="text-base font-semibold mb-5">API Credentials</h2>

              <div className="flex flex-col gap-4">
                {/* API Token */}
                <div>
                  <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                    Permanent Access Token
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={form.api_token}
                        onChange={e => setForm({ ...form, api_token: e.target.value })}
                        placeholder="EAAx..."
                        className="hp-input pr-10"
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-white"
                      >
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone Number ID */}
                <div>
                  <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={form.phone_number_id}
                    onChange={e => setForm({ ...form, phone_number_id: e.target.value })}
                    placeholder="123456789012345"
                    className="hp-input"
                  />
                </div>

                {/* WABA ID */}
                <div>
                  <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                    WhatsApp Business Account ID
                  </label>
                  <input
                    type="text"
                    value={form.waba_id}
                    onChange={e => setForm({ ...form, waba_id: e.target.value })}
                    placeholder="123456789012345"
                    className="hp-input"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="hp-btn hp-btn-primary"
                  >
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Credentials'}
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={verifying || !form.api_token || !form.phone_number_id}
                    className="hp-btn hp-btn-secondary"
                  >
                    {verifying ? <><Loader2 size={14} className="animate-spin" /> Verifying...</> : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="hp-glass-card p-6">
              <h2 className="text-base font-semibold mb-1.5">Webhook Configuration</h2>
              <p className="text-xs text-[#888] mb-5">
                Configure this URL in your Meta WhatsApp Business Account settings to receive inbound messages and status updates.
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                    Callback URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="hp-input font-mono text-[#FCA311]"
                    />
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="hp-btn hp-btn-secondary px-4"
                    ><Copy size={14} /> Copy</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                    Verify Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={creds?.webhook_verify_token || 'Loading...'}
                      readOnly
                      className="hp-input font-mono"
                    />
                    <button
                      onClick={handleResetWebhookToken}
                      className="hp-btn hp-btn-secondary px-4"
                    ><RefreshCw size={14} /> Reset</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Guide */}
            <div className="hp-glass-card p-6 bg-[#FCA311]/[0.04] border-[#FCA311]/20">
              <h2 className="text-base font-semibold mb-3 text-[#FCA311]">Setup Guide</h2>
              <ol className="text-xs text-[#aaa] flex flex-col gap-3 pl-5 list-decimal">
                <li>Go to the <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#FCA311] underline">Meta Developer Portal <ExternalLink size={10} className="inline" /></a></li>
                <li>Create or open your WhatsApp Business App</li>
                <li>Go to <strong>WhatsApp &rarr; Configuration</strong> and note your Phone Number ID and WABA ID</li>
                <li>Go to <strong>WhatsApp &rarr; Configuration &rarr; Send Messages &rarr; Permanent Token</strong> to generate an access token</li>
                <li>Enter the credentials above and click <strong>Test Connection</strong></li>
                <li>In the Meta App dashboard, go to <strong>Webhooks &rarr; Edit Subscription</strong></li>
                <li>Set the Callback URL to the URL shown above and the Verify Token to the token shown above</li>
                <li>Subscribe to: <strong>messages</strong>, <strong>message_deliveries</strong>, <strong>message_reads</strong></li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

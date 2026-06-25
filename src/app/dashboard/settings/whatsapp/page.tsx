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
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(20,33,61,0.6)',
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888' }}>/</span>
        <Link href="/dashboard" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Settings</Link>
        <span style={{ color: '#888' }}>/</span>
        <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: 500 }}>WhatsApp</span>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>WhatsApp Integration</h1>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Connect your Meta WhatsApp Business Account to enable automated messaging and shared inbox.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 size={24} style={{ color: '#FCA311', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Connection Status */}
            <div style={{
              background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                {creds?.is_connected ? (
                  <CheckCircle size={20} style={{ color: '#10b981' }} />
                ) : (
                  <XCircle size={20} style={{ color: '#ef4444' }} />
                )}
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {creds?.is_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {creds?.last_verified_at && (
                <p style={{ color: '#666', fontSize: '0.8rem', marginLeft: '32px' }}>
                  Last verified: {new Date(creds.last_verified_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* Credentials Form */}
            <div style={{
              background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '1.5rem',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>API Credentials</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* API Token */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Permanent Access Token
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={form.api_token}
                        onChange={e => setForm({ ...form, api_token: e.target.value })}
                        placeholder="EAAx..."
                        style={{
                          width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px', padding: '10px 40px 10px 12px',
                          color: '#fff', fontSize: '13px', outline: 'none',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone Number ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={form.phone_number_id}
                    onChange={e => setForm({ ...form, phone_number_id: e.target.value })}
                    placeholder="123456789012345"
                    style={{
                      width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px', padding: '10px 12px',
                      color: '#fff', fontSize: '13px', outline: 'none',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                {/* WABA ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.35rem', fontWeight: 500 }}>
                    WhatsApp Business Account ID
                  </label>
                  <input
                    type="text"
                    value={form.waba_id}
                    onChange={e => setForm({ ...form, waba_id: e.target.value })}
                    placeholder="123456789012345"
                    style={{
                      width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px', padding: '10px 12px',
                      color: '#fff', fontSize: '13px', outline: 'none',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(135deg, #FCA311, #E09800)',
                      color: '#000', border: 'none', padding: '10px 24px',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                      cursor: saving ? 'wait' : 'pointer',
                      boxShadow: '0 4px 12px rgba(252,163,17,0.25)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Credentials'}
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={verifying || !form.api_token || !form.phone_number_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#E5E5E5', padding: '10px 24px',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                      cursor: verifying ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    {verifying ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</> : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div style={{
              background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '1.5rem',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Webhook Configuration</h2>
              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                Configure this URL in your Meta WhatsApp Business Account settings to receive inbound messages and status updates.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Callback URL
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      style={{
                        flex: 1, background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px', padding: '10px 12px',
                        color: '#FCA311', fontSize: '13px', outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#888', padding: '10px 16px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                      }}
                    ><Copy size={14} /> Copy</button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Verify Token
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={creds?.webhook_verify_token || 'Loading...'}
                      readOnly
                      style={{
                        flex: 1, background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px', padding: '10px 12px',
                        color: '#fff', fontSize: '13px', outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={handleResetWebhookToken}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#888', padding: '10px 16px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                      }}
                    ><RefreshCw size={14} /> Reset</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Guide */}
            <div style={{
              background: 'rgba(252,163,17,0.04)', border: '1px solid rgba(252,163,17,0.12)',
              borderRadius: '14px', padding: '1.5rem',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#FCA311' }}>Setup Guide</h2>
              <ol style={{ color: '#aaa', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.25rem' }}>
                <li>Go to the <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#FCA311', textDecoration: 'underline' }}>Meta Developer Portal <ExternalLink size={10} style={{ display: 'inline' }} /></a></li>
                <li>Create or open your WhatsApp Business App</li>
                <li>Go to <strong>WhatsApp → Configuration</strong> and note your Phone Number ID and WABA ID</li>
                <li>Go to <strong>WhatsApp → Configuration → Send Messages → Permanent Token</strong> to generate an access token</li>
                <li>Enter the credentials above and click <strong>Test Connection</strong></li>
                <li>In the Meta App dashboard, go to <strong>Webhooks → Edit Subscription</strong></li>
                <li>Set the Callback URL to the URL shown above and the Verify Token to the token shown above</li>
                <li>Subscribe to: <strong>messages</strong>, <strong>message_deliveries</strong>, <strong>message_reads</strong></li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

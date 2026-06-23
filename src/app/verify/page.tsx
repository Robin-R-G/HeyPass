'use client';

import { useState } from 'react';
import Link from 'next/link';

interface VerificationResult {
  valid: boolean;
  certificate_number?: string;
  recipient_name?: string;
  event_title?: string;
  certificate_type?: string;
  issued_at?: string;
  organization?: string;
  status?: string;
  verification_count?: number;
  pdf_url?: string;
}

export default function VerifyPage() {
  const [method, setMethod] = useState<'number' | 'url'>('number');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');

  async function handleVerify() {
    if (!input.trim()) { setError('Please enter a value'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = method === 'number'
        ? { certificate_number: input, method: 'number' }
        : { access_token: input, method: 'url' };

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.captcha_required) {
        setError('Too many requests. Please try again later.');
      } else {
        setResult(data);
        if (!data.valid) setError('Certificate not found or has been revoked');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
    border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)',
    color: '#fff', fontSize: '0.9rem', outline: 'none' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '1.5rem' }}>← Back to Home</a>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Certificate Verification</h1>
          <p style={{ color: '#E5E5E5', marginTop: '0.5rem' }}>Verify the authenticity of a certificate</p>
        </div>

        <div style={{ background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          {/* Tab buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '1.25rem', background: 'rgba(229,229,229,0.05)', borderRadius: '10px', padding: '3px' }}>
            {[
              { key: 'number' as const, label: 'Certificate Number' },
              { key: 'url' as const, label: 'Direct Link' },
            ].map(t => (
              <button key={t.key} onClick={() => { setMethod(t.key); setResult(null); setError(''); }}
                style={{
                  padding: '0.6rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: method === t.key ? 'rgba(252,163,17,0.2)' : 'transparent',
                  color: method === t.key ? '#E5E5E5' : '#888888',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>
              {method === 'number' ? 'Certificate Number' : 'Verification Token'}
            </label>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              placeholder={method === 'number' ? 'CERT-2026-000000-ABCDEF' : 'Enter token from certificate URL'}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
          </div>

          <button onClick={handleVerify} disabled={loading || !input.trim()}
            style={{
              width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #FCA311, #E09800)',
              color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}>
            {loading ? 'Verifying...' : 'Verify Certificate'}
          </button>

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result?.valid && (
          <div style={{ background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Valid</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>Certificate Verified</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              {[
                { label: 'Certificate #', value: result.certificate_number, mono: true },
                { label: 'Recipient', value: result.recipient_name },
                { label: 'Event', value: result.event_title },
                { label: 'Type', value: result.certificate_type },
                { label: 'Organization', value: result.organization },
                { label: 'Issued', value: result.issued_at ? new Date(result.issued_at).toLocaleDateString() : '-' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ color: '#888888', fontSize: '0.75rem' }}>{item.label}</div>
                  <div style={{ color: item.mono ? '#E5E5E5' : '#fff', fontFamily: item.mono ? 'var(--font-jetbrains, monospace)' : 'inherit' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(229,229,229,0.08)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#888888' }}>Verified {result.verification_count || 0} time(s)</div>
            </div>

            {result.pdf_url && (
              <button onClick={() => window.open(result.pdf_url, '_blank')}
                style={{ width: '100%', marginTop: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(229,229,229,0.06)', border: '1px solid rgba(229,229,229,0.15)', color: '#E5E5E5', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Download Certificate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

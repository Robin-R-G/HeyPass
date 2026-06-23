'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    if (!input.trim()) {
      setError('Please enter a value');
      return;
    }

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
        return;
      }

      setResult(data);

      if (!data.valid) {
        setError('Certificate not found or has been revoked');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#011C40', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          color: '#9cb8c4', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '1.5rem',
        }}>← Back to Home</a>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Certificate Verification</h1>
          <p style={{ color: '#9cb8c4', marginTop: '0.5rem' }}>Verify the authenticity of a certificate</p>
        </div>

        <div style={{
          background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.08)',
          borderRadius: '16px', padding: '1.5rem',
        }}>
          <Tabs value={method} onValueChange={(v) => { setMethod(v as any); setResult(null); setError(''); }}>
            <TabsList style={{ display: 'grid', width: '100%', gridTemplateColumns: '1fr 1fr', background: 'rgba(167,235,242,0.05)' }}>
              <TabsTrigger value="number" style={{ color: '#9cb8c4' }}>Certificate Number</TabsTrigger>
              <TabsTrigger value="url" style={{ color: '#9cb8c4' }}>Direct Link</TabsTrigger>
            </TabsList>

              <TabsContent value="number" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Certificate Number</Label>
                  <Input
                    placeholder="CERT-2026-000000-ABCDEF"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Verification Token</Label>
                  <Input
                    placeholder="Enter token from certificate URL"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleVerify}
              disabled={loading || !input.trim()}
              className="w-full mt-4"
            >
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </Button>

            {error && (
              <div style={{
                marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', fontSize: '0.85rem',
              }}>
                {error}
              </div>
            )}
          </div>

        {result?.valid && (
          <div style={{
            background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.08)',
            borderRadius: '16px', padding: '1.5rem', marginTop: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{
                padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
              }}>Valid</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>Certificate Verified</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#5a7a8a', fontSize: '0.75rem' }}>Certificate #</div>
                <div style={{ fontFamily: 'var(--font-jetbrains, monospace)', color: '#A7EBF2' }}>{result.certificate_number}</div>
              </div>
              <div>
                <div style={{ color: '#5a7a8a', fontSize: '0.75rem' }}>Recipient</div>
                <div style={{ color: '#fff' }}>{result.recipient_name}</div>
              </div>
              <div>
                <div style={{ color: '#5a7a8a', fontSize: '0.75rem' }}>Event</div>
                <div style={{ color: '#fff' }}>{result.event_title}</div>
              </div>
              <div>
                <div style={{ color: '#5a7a8a', fontSize: '0.75rem' }}>Type</div>
                <div style={{ color: '#fff' }}>{result.certificate_type}</div>
              </div>
              <div>
                <div style={{ color: '#5a7a8a', fontSize: '0.75rem' }}>Organization</div>
                <div style={{ color: '#fff' }}>{result.organization}</div>
              </div>
              <div>
                <div style={{ color: '#5a7a8a', fontSize: '0.75rem' }}>Issued</div>
                <div style={{ color: '#fff' }}>{result.issued_at ? new Date(result.issued_at).toLocaleDateString() : '-'}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(167,235,242,0.08)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#5a7a8a' }}>
                Verified {result.verification_count || 0} time(s)
              </div>
            </div>

            {result.pdf_url && (
              <button
                onClick={() => window.open(result.pdf_url, '_blank')}
                style={{
                  width: '100%', marginTop: '1rem', padding: '0.7rem', borderRadius: '8px',
                  background: 'rgba(167,235,242,0.06)', border: '1px solid rgba(167,235,242,0.15)',
                  color: '#A7EBF2', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Download Certificate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

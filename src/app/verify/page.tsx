'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-[440px] p-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-hp-text-secondary/60 hover:text-white no-underline mb-6 transition-all duration-150">
          ← Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">Certificate Verification</h1>
          <p className="text-sm text-hp-text-secondary opacity-70">Verify the authenticity of a certificate</p>
        </div>

        <div className="hp-glass-card bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl">
          {/* Tab buttons */}
          <div className="grid grid-cols-2 gap-0 mb-5 bg-white/5 rounded-xl p-1">
            {[
              { key: 'number' as const, label: 'Certificate Number' },
              { key: 'url' as const, label: 'Direct Link' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setMethod(t.key); setResult(null); setError(''); }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
                  method === t.key
                    ? 'bg-[#FCA311]/20 text-white shadow'
                    : 'bg-transparent text-hp-text-secondary/60 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="mb-5">
            <label className="block text-hp-text-secondary text-xs font-semibold mb-2">
              {method === 'number' ? 'Certificate Number' : 'Verification Token'}
            </label>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={method === 'number' ? 'CERT-2026-000000-ABCDEF' : 'Enter token from certificate URL'}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || !input.trim()}
            className="w-full h-11 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-1.5 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </span>
            ) : (
              'Verify Certificate'
            )}
          </Button>

          {error && (
            <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-lg p-3 text-[#ef4444] text-xs text-center mt-4">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result?.valid && (
          <div className="hp-glass-card bg-[#0a0a0a]/60 border border-white/8 rounded-2xl p-6 mt-4 shadow-2xl hp-animate-scale-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#10b981]/15 text-[#10b981]">Valid</span>
              <span className="font-semibold text-white text-sm">Certificate Verified</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {[
                { label: 'Certificate #', value: result.certificate_number, mono: true },
                { label: 'Recipient', value: result.recipient_name },
                { label: 'Event', value: result.event_title },
                { label: 'Type', value: result.certificate_type },
                { label: 'Organization', value: result.organization },
                { label: 'Issued', value: result.issued_at ? new Date(result.issued_at).toLocaleDateString() : '-' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-hp-text-secondary/60 text-[10px] font-medium uppercase tracking-wider mb-1">{item.label}</div>
                  <div className={`text-white text-sm font-medium ${item.mono ? 'font-mono text-hp-text-secondary' : ''}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/8 pt-3.5 mt-3.5">
              <div className="text-xs text-hp-text-secondary/60">Verified {result.verification_count || 0} time(s)</div>
            </div>

            {result.pdf_url && (
              <Button
                onClick={() => window.open(result.pdf_url, '_blank')}
                className="w-full mt-4 h-10 text-xs font-semibold cursor-pointer"
              >
                Download Certificate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

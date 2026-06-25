'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to send reset email');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-[400px] p-6">
        <div className="text-center mb-8">
          <Link href="/" className="no-underline">
            <div className="inline-flex items-center gap-2 mb-4">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-lg text-black">H</div>
              <span className="text-xl font-bold text-white">HeyPass</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">Reset your password</h1>
          <p className="text-sm text-hp-text-secondary opacity-70">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <div className="hp-glass-card bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-4">📧</div>
              <h2 className="text-base font-bold text-white mb-2">Check your email</h2>
              <p className="text-xs text-hp-text-secondary opacity-70 leading-relaxed">
                We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.<br />
                The link will expire in 1 hour.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Email</label>
                <Input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-lg p-3 text-[#ef4444] text-xs text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit" disabled={loading || !email}
                className="w-full h-11 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-hp-text-secondary/60">
          <Link href="/auth/login" className="text-[#FCA311] font-semibold no-underline hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

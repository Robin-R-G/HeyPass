'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-transparent flex items-center justify-center py-12 font-sans antialiased">
      <div className="w-full max-w-[420px] px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 no-underline" aria-label="HeyPass home">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-lg text-black shadow-lg shadow-[#FCA311]/25">H</div>
          <span className="text-xl font-bold text-white tracking-tight">HeyPass</span>
        </Link>

        {/* Title */}
        <div className="text-center mb-7">
          <h1 className="text-[1.7rem] font-extrabold text-white mb-1.5 tracking-tight">Reset your password</h1>
          <p className="text-sm text-[#999]">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        {/* Card */}
        <div className="hp-glass-card p-7 sm:p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#10b981]/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-[#10b981]" />
              </div>
              <h2 className="text-base font-bold text-white mb-2">Check your email</h2>
              <p className="text-[13px] text-[#999] leading-relaxed">
                We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.<br />
                The link will expire in 1 hour.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="forgot-email" className="block text-[13px] font-semibold text-[#ccc] mb-2">Email</label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              {error && (
                <div role="alert" className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-3 text-[#ef4444] text-[13px] text-center">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading || !email} className="w-full h-12 font-bold text-[15px]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Back link */}
        <p className="text-center mt-6 text-[13px] text-[#777]">
          <Link href="/auth/login" className="text-[#FCA311] font-semibold no-underline hover:underline">&larr; Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = password === confirmPassword || confirmPassword === '';
  const passwordError = confirmPassword && !passwordsMatch ? 'Passwords do not match' : '';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const token = searchParams.get('token');
      const user_id = searchParams.get('user_id');
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, user_id, password }),
      });

      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push('/auth/login'), 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Reset failed. Link may have expired.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] px-5">
      {/* Logo */}
      <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 no-underline" aria-label="HeyPass home">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-lg text-white shadow-lg shadow-[var(--hp-primary)]/25">H</div>
        <span className="text-xl font-bold tracking-tight"><span className="text-[var(--hp-primary)]">Hey</span><span className="text-[var(--hp-text)]">Pass</span></span>
      </Link>

      {/* Title */}
      <div className="text-center mb-7">
        <h1 className="text-[1.7rem] font-extrabold text-[var(--hp-text)] mb-1.5 tracking-tight">Set new password</h1>
        <p className="text-sm text-[var(--hp-text-muted)]">Choose a strong password for your account</p>
      </div>

      {/* Card */}
      <div className="hp-glass-card p-7 sm:p-8">
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[var(--hp-success)]/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-[var(--hp-text-success)]" />
            </div>
            <h2 className="text-base font-bold text-[var(--hp-text-success)] mb-2">Password updated!</h2>
            <p className="text-[13px] text-[var(--hp-text-muted)]">Redirecting to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5" noValidate>
            <div>
              <label htmlFor="reset-password" className="hp-form-label">New Password</label>
              <div className="hp-password-wrapper">
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Min 8 chars, uppercase, number"
                  autoComplete="new-password"
                  aria-required="true"
                  className="pr-10"
                />
                <button type="button" className="hp-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm" className="hp-form-label">Confirm Password</label>
              <div className="hp-password-wrapper">
                <Input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!passwordsMatch}
                  aria-describedby={passwordError ? 'reset-password-error' : undefined}
                  className="pr-10"
                />
                <button type="button" className="hp-password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && (
                <p id="reset-password-error" className="text-[var(--hp-error)] text-xs mt-1.5" role="alert">{passwordError}</p>
              )}
            </div>

            {error && (
              <div role="alert" className="bg-[var(--hp-error-bg)] border border-[var(--hp-error)]/20 rounded-[var(--hp-radius-md)] px-4 py-3 text-[var(--hp-error)] text-[13px] text-center">{error}</div>
            )}

            <Button type="submit" disabled={loading || !password || !confirmPassword || !passwordsMatch} className="w-full h-12 font-bold text-[15px]">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center py-12 font-sans antialiased">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-[var(--hp-text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      }>
        <ResetForm />
      </Suspense>
    </div>
  );
}

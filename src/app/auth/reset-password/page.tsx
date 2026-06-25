'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {};

function ResetForm({}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
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
    <div className="w-full max-w-[400px] p-6">
      <div className="text-center mb-8">
        <Link href="/" className="no-underline">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-lg text-black">H</div>
            <span className="text-xl font-bold text-white">HeyPass</span>
          </div>
        </Link>
        <h1 className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">Set new password</h1>
        <p className="text-sm text-hp-text-secondary opacity-70">Choose a strong password for your account</p>
      </div>

      <div className="hp-glass-card bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl">
        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-4 text-[#10b981]">&#10003;</div>
            <h2 className="text-base font-bold text-[#10b981] mb-2">Password updated!</h2>
            <p className="text-xs text-hp-text-secondary opacity-70">Redirecting to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-hp-text-secondary text-xs font-semibold mb-2">New Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 chars, uppercase..." />
            </div>
            <div>
              <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat your password" />
            </div>

            {error && (
              <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-lg p-3 text-[#ef4444] text-xs text-center">{error}</div>
            )}

            <Button type="submit" disabled={loading || !password || !confirmPassword}
              className="w-full h-11 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center font-sans antialiased">
      <Suspense fallback={<div className="text-hp-text-secondary opacity-70 text-sm animate-pulse">Loading...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      const tokens = data.data?.tokens || data.data?.session;
      if (tokens?.access_token) {
        localStorage.setItem('access_token', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refresh_token', tokens.refresh_token);
        }

        // Decode JWT to check superadmin status
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          if (payload.is_superadmin) {
            router.push('/superadmin');
            return;
          }
        } catch {}
      }

      // Auto-select client if user has exactly one
      try {
        const clientsRes = await fetch('/api/auth/my-clients', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const clientsData = await clientsRes.json();
        const clients = clientsData.data?.clients || [];

        if (clients.length === 1) {
          const selectRes = await fetch('/api/auth/select-client', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.access_token}`,
            },
            body: JSON.stringify({ client_id: clients[0].client_id }),
          });
          const selectData = await selectRes.json();
          const newTokens = selectData.data?.session;
          if (newTokens?.access_token) {
            localStorage.setItem('access_token', newTokens.access_token);
            localStorage.setItem('refresh_token', newTokens.refresh_token);
          }
        } else if (clients.length === 0) {
          router.push('/auth/select-client');
          return;
        }
      } catch {
        // If my-clients fails, try going to dashboard anyway
      }

      router.push(redirect);
    } catch {
      setError('Network error. Please try again.');
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
        <h1 className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">Welcome back</h1>
        <p className="text-sm text-hp-text-secondary opacity-70">Sign in to your account</p>
      </div>

      <div className="hp-glass-card bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>

          {error && (
            <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-lg p-3 text-[#ef4444] text-xs text-center">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !email || !password} className="w-full h-11 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center mt-5">
          <Link href="/auth/forgot-password" className="text-[#FCA311] text-xs font-medium no-underline hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <p className="text-center mt-6 text-xs text-hp-text-secondary/60">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="text-[#FCA311] font-semibold no-underline hover:underline">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center font-sans antialiased">
      <Suspense fallback={<div className="text-hp-text-secondary opacity-70 text-sm animate-pulse">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

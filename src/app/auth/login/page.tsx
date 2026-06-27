'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

        if (data.data?.force_password_change) {
          router.push('/auth/force-password-change');
          return;
        }

        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          if (payload.is_superadmin) {
            router.push('/superadmin');
            return;
          }
        } catch {}
      }

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
      } catch {}

      router.push(redirect);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] px-5">
      {/* Logo */}
      <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 no-underline" aria-label="HeyPass home">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-lg text-white shadow-lg shadow-[var(--hp-primary)]/25">H</div>
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[var(--hp-primary)]">Hey</span>
          <span className="text-[var(--hp-text)]">Pass</span>
        </span>
      </Link>

      {/* Title */}
      <div className="text-center mb-7">
        <h1 className="text-[1.7rem] font-extrabold text-[var(--hp-text)] mb-1.5 tracking-tight">Welcome back</h1>
        <p className="text-sm text-[var(--hp-text-muted)]">Sign in to your account</p>
      </div>

      {/* Card */}
      <div className="hp-glass-card p-7 sm:p-8">
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <div className="hp-form-group">
            <label htmlFor="login-email" className="hp-form-label">Email</label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              aria-required="true"
            />
          </div>

          <div className="hp-form-group">
            <label htmlFor="login-password" className="hp-form-label">Password</label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-required="true"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="bg-[var(--hp-error-bg)] border border-[var(--hp-error)]/20 rounded-[var(--hp-radius-md)] px-4 py-3 text-[var(--hp-error)] text-[13px] text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full h-12 font-bold text-[15px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="text-center mt-5 pt-5 border-t border-[var(--hp-border)]">
          <Link href="/auth/forgot-password" className="text-[var(--hp-primary)] text-[13px] font-medium no-underline hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <p className="text-center mt-6 text-[13px] text-[var(--hp-text-muted)]">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="text-[var(--hp-primary)] font-semibold no-underline hover:underline">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center py-12 font-sans antialiased">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-[var(--hp-text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

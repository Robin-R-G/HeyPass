'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }

      router.push(redirect);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%' as const, padding: '0.7rem 1rem', borderRadius: '8px',
    border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)',
    color: '#fff', fontSize: '0.9rem', outline: 'none' as const,
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #FCA311, #E09800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.1rem', color: '#000',
            }}>H</div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>HeyPass</span>
          </div>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Welcome back</h1>
        <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Sign in to your account</p>
      </div>

      <div style={{ background: 'rgba(20,33,61,0.6)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px', padding: '2rem' }}>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" style={inputStyle} />
          </div>

          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #FCA311, #E09800)',
              color: '#000', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              opacity: loading || !email || !password ? 0.5 : 1,
            }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link href="/auth/forgot-password" style={{ color: '#FCA311', fontSize: '0.8rem', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#888', fontSize: '0.85rem' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" style={{ color: '#FCA311', textDecoration: 'none', fontWeight: 500 }}>Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <Suspense fallback={<div style={{ color: '#E5E5E5' }}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

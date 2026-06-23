'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const tokens = data.data?.tokens || data.data?.session;
      if (tokens?.access_token) {
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Create your account</h1>
          <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Start managing events today</p>
        </div>

        <div style={{ background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px', padding: '2rem' }}>
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>First Name</label>
                <input
                  type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="John"
                  style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Last Name</label>
                <input
                  type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Doe"
                  style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min 8 chars, uppercase, lowercase, number"
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Confirm Password</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                placeholder="Repeat your password"
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || !email || !password || !confirmPassword}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #FCA311, #E09800)',
                color: '#000', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                opacity: loading || !email || !password || !confirmPassword ? 0.5 : 1,
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#888888', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: '#E5E5E5', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

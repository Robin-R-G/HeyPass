'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #FCA311, #E09800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>H</div>
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>HeyPass</span>
            </div>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Reset your password</h1>
          <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <div style={{ background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px', padding: '2rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📧</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>Check your email</h2>
              <p style={{ color: '#E5E5E5', fontSize: '0.85rem', lineHeight: 1.6 }}>
                We&apos;ve sent a password reset link to <strong style={{ color: '#E5E5E5' }}>{email}</strong>.<br />
                The link will expire in 1 hour.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              {error && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading || !email}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #FCA311, #E09800)',
                  color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  opacity: loading || !email ? 0.5 : 1,
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#888888', fontSize: '0.85rem' }}>
          <Link href="/auth/login" style={{ color: '#E5E5E5', textDecoration: 'none', fontWeight: 500 }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

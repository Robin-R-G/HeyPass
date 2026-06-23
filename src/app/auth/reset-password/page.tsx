'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
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
    }
    setLoading(false);
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
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #FCA311, #E09800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#000' }}>H</div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>HeyPass</span>
          </div>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Set new password</h1>
        <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Choose a strong password for your account</p>
      </div>

      <div style={{ background: 'rgba(20,33,61,0.6)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px', padding: '2rem' }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>&#10003;</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981', marginBottom: '0.5rem' }}>Password updated!</h2>
            <p style={{ color: '#E5E5E5', fontSize: '0.85rem' }}>Redirecting to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 chars, uppercase, lowercase, number" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat your password" style={inputStyle} />
            </div>

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>
            )}

            <button type="submit" disabled={loading || !password || !confirmPassword}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #FCA311, #E09800)', color: '#000', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: loading || !password || !confirmPassword ? 0.5 : 1 }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <Suspense fallback={<div style={{ color: '#E5E5E5' }}>Loading...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}

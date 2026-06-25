'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-transparent flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-[400px] p-6">
        <div className="text-center mb-8">
          <Link href="/" className="no-underline">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-lg text-black">H</div>
              <span className="text-xl font-bold text-white">HeyPass</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">Create your account</h1>
          <p className="text-sm text-hp-text-secondary opacity-70">Start managing events today</p>
        </div>

        <div className="hp-glass-card bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-hp-text-secondary text-xs font-semibold mb-2">First Name</label>
                <Input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
              </div>
              <div>
                <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Last Name</label>
                <Input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>

            <div>
              <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 chars, uppercase..." />
            </div>

            <div>
              <label className="block text-hp-text-secondary text-xs font-semibold mb-2">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat your password" />
            </div>

            {error && (
              <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-lg p-3 text-[#ef4444] text-xs text-center">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !email || !password || !confirmPassword} className="w-full h-11 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-hp-text-secondary/60">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#FCA311] font-semibold no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

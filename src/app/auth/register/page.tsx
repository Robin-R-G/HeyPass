'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword || confirmPassword === '';
  const passwordError = confirmPassword && !passwordsMatch ? 'Passwords do not match' : '';

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
    <div className="min-h-screen bg-transparent flex items-center justify-center py-12 font-sans antialiased">
      <div className="w-full max-w-[420px] px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 no-underline" aria-label="HeyPass home">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-lg text-black shadow-lg shadow-[#FCA311]/25">H</div>
          <span className="text-xl font-bold text-white tracking-tight">HeyPass</span>
        </Link>

        {/* Title */}
        <div className="text-center mb-7">
          <h1 className="text-[1.7rem] font-extrabold text-white mb-1.5 tracking-tight">Create your account</h1>
          <p className="text-sm text-[#999]">Start managing events today</p>
        </div>

        {/* Card */}
        <div className="hp-glass-card p-7 sm:p-8">
          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-first" className="block text-[13px] font-semibold text-[#ccc] mb-2">First Name</label>
                <Input id="reg-first" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" autoComplete="given-name" />
              </div>
              <div>
                <label htmlFor="reg-last" className="block text-[13px] font-semibold text-[#ccc] mb-2">Last Name</label>
                <Input id="reg-last" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" autoComplete="family-name" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-[13px] font-semibold text-[#ccc] mb-2">Email</label>
              <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" aria-required="true" />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-[13px] font-semibold text-[#ccc] mb-2">Password</label>
              <div className="hp-password-wrapper">
                <Input
                  id="reg-password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-[13px] font-semibold text-[#ccc] mb-2">Confirm Password</label>
              <div className="hp-password-wrapper">
                <Input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!passwordsMatch}
                  aria-describedby={passwordError ? 'reg-password-error' : undefined}
                  className="pr-10"
                />
                <button type="button" className="hp-password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && (
                <p id="reg-password-error" className="text-[#ef4444] text-xs mt-1.5" role="alert">{passwordError}</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-3 text-[#ef4444] text-[13px] text-center">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={loading || !email || !password || !confirmPassword || !passwordsMatch} className="w-full h-12 font-bold text-[15px] mt-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </div>

        {/* Sign in link */}
        <p className="text-center mt-6 text-[13px] text-[#777]">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#FCA311] font-semibold no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

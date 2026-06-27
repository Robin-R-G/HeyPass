'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { useToast } from '@/components/toast';

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain uppercase, lowercase, and a number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to change password');
      }

      toast('Password changed successfully', 'success');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--hp-bg)] text-white font-sans antialiased flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 no-underline">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-lg text-white shadow-lg shadow-[var(--hp-primary)]/25">H</div>
          <span className="text-xl font-bold tracking-tight"><span className="text-[var(--hp-primary)]">Hey</span><span className="text-[var(--hp-text)]">Pass</span></span>
        </Link>

        <div className="hp-glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--hp-primary)]/10 flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-[var(--hp-primary)]" />
            </div>
            <h1 className="text-xl font-extrabold text-[var(--hp-text)] mb-1.5">Change Your Password</h1>
            <p className="text-sm text-[var(--hp-text-muted)]">For security, please set a new password before continuing.</p>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-password" className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hp-text-muted)] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
              />
            </div>

            {error && (
              <div className="bg-[var(--hp-error-bg)] border border-[var(--hp-error)]/15 rounded-[var(--hp-radius-md)] p-3 text-[var(--hp-error)] text-xs">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-12 font-bold text-[15px]">
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

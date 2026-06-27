'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(`/auth/login?redirect=/auth/accept-invite?token=${token}`);
      return;
    }
    if (token) {
      acceptInvitation();
    } else {
      setLoading(false);
      setResult('error');
      setMessage('No invitation token provided');
    }
  }, [token, router]);

  const acceptInvitation = async () => {
    try {
      const res = await authFetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_token: token }),
      });

      if (res.ok) {
        setResult('success');
        setMessage('You have been added to the organization!');
        setTimeout(() => router.push('/dashboard'), 3000);
      } else {
        const data = await res.json();
        setResult('error');
        setMessage(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setResult('error');
      setMessage('Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--hp-bg)] text-white font-sans antialiased flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] text-center">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 no-underline">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center shadow-lg shadow-[var(--hp-primary)]/25"></div>
          <span className="text-xl font-bold tracking-tight"><span className="text-[var(--hp-primary)]">Hey</span><span className="text-[var(--hp-text)]">Pass</span></span>
        </Link>

        {loading || accepting ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-[var(--hp-primary)] animate-spin" />
            <p className="text-sm text-[var(--hp-text-muted)]">Accepting invitation...</p>
          </div>
        ) : result === 'success' ? (
          <div className="hp-glass-card p-8">
            <CheckCircle size={48} className="text-[var(--hp-text-success)] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[var(--hp-text)] mb-2">Welcome!</h2>
            <p className="text-sm text-[var(--hp-text-muted)] mb-4">{message}</p>
            <p className="text-xs text-[var(--hp-text-muted)]">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="hp-glass-card p-8">
            <XCircle size={48} className="text-[var(--hp-error)] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[var(--hp-text)] mb-2">Invitation Failed</h2>
            <p className="text-sm text-[var(--hp-text-muted)] mb-4">{message}</p>
            <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--hp-primary)] text-white text-xs font-bold rounded-[var(--hp-radius-md)] no-underline hover:bg-[var(--hp-primary-hover)] transition-colors">
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--hp-bg)] text-white font-sans antialiased flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-[var(--hp-primary)] animate-spin" />
          <p className="text-sm text-[var(--hp-text-muted)]">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

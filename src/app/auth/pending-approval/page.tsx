'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch, isAuthenticated, logout } from '@/lib/auth-client';
import { Loader2, Clock, CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';

interface MembershipStatus {
  id: string;
  status: string;
  organization_name: string;
  role_name: string | null;
  created_at: string;
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    fetchMembershipStatus();
  }, [router]);

  useEffect(() => {
    if (!polling) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await authFetch('/api/auth/pending-status');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'active') {
            setPolling(false);
            router.push('/dashboard');
          } else if (data.status === 'rejected') {
            setPolling(false);
            setError('Your membership request was not approved. Please contact the organization administrator.');
          }
        }
      } catch {
        // Silently fail, will retry on next interval
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [polling, router]);

  const fetchMembershipStatus = async () => {
    try {
      const res = await authFetch('/api/auth/pending-status');
      if (res.ok) {
        const data = await res.json();
        setMembership(data);
        if (data.status === 'active') {
          router.push('/dashboard');
        } else if (data.status === 'rejected') {
          setError('Your membership request was not approved. Please contact the organization administrator.');
          setPolling(false);
        }
      } else {
        setError('Failed to load membership status');
      }
    } catch {
      setError('Failed to load membership status');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--hp-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center py-12 font-sans antialiased">
      <div className="w-full max-w-[420px] px-5">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 no-underline" aria-label="HeyPass home">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center shadow-lg shadow-[var(--hp-primary)]/25"></div>
          <span className="text-xl font-bold tracking-tight"><span className="text-[var(--hp-primary)]">Hey</span><span className="text-[var(--hp-text)]">Pass</span></span>
        </Link>

        <div className="text-center mb-7">
          <h1 className="text-[1.7rem] font-extrabold text-[var(--hp-text)] mb-1.5 tracking-tight">Pending Approval</h1>
          <p className="text-sm text-[var(--hp-text-muted)]">Your membership is being reviewed</p>
        </div>

        <div className="hp-glass-card p-7 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--hp-warning-bg)] flex items-center justify-center">
              <Clock className="w-8 h-8 text-[var(--hp-warning)]" />
            </div>
            <p className="text-[var(--hp-text)] mb-2">
              Your request to join <span className="font-semibold">{membership?.organization_name || 'the organization'}</span> is pending approval.
            </p>
            <p className="text-sm text-[var(--hp-text-muted)]">
              An administrator will review your request shortly. You will be notified once approved.
            </p>
          </div>

          {membership && (
            <div className="bg-[var(--hp-surface)] rounded-[var(--hp-radius-md)] p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--hp-text-muted)]">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--hp-warning-bg)] text-[var(--hp-warning)]">
                  Pending
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-[var(--hp-text-muted)]">Organization:</span>
                <span className="text-[var(--hp-text)]">{membership.organization_name}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-[var(--hp-text-muted)]">Requested:</span>
                <span className="text-[var(--hp-text)]">{new Date(membership.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-[var(--hp-error-bg)] border border-[var(--hp-error)]/20 rounded-[var(--hp-radius-md)] px-4 py-3 text-[var(--hp-error)] text-[13px] text-center mb-6">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full h-10 font-semibold text-sm border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] text-[var(--hp-text)] hover:bg-[var(--hp-surface)] transition-colors"
            >
              Refresh Status
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full h-10 font-semibold text-sm border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] text-[var(--hp-text-muted)] hover:bg-[var(--hp-surface)] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-[13px] text-[var(--hp-text-muted)]">
          <Link href="/" className="inline-flex items-center gap-1 text-[var(--hp-primary)] font-semibold no-underline hover:underline">
            <ArrowLeft className="w-3 h-3" />
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

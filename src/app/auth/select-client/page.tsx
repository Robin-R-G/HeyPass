'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Building2 } from 'lucide-react';

interface Client {
  client_id: string;
  name: string;
  slug: string;
  role: string;
}

export default function SelectClientPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetch('/api/auth/my-clients', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const list = data.data?.clients || [];
        setClients(list);
        setLoading(false);

        if (list.length === 1) {
          autoSelect(list[0].client_id, token);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const autoSelect = async (clientId: string, token: string) => {
    try {
      const res = await fetch('/api/auth/select-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      const newTokens = data.data?.session;
      if (newTokens?.access_token) {
        localStorage.setItem('access_token', newTokens.access_token);
        if (newTokens.refresh_token) {
          localStorage.setItem('refresh_token', newTokens.refresh_token);
        }
      }
      router.push('/dashboard');
    } catch {
      setSelecting(null);
    }
  };

  const selectClient = async (clientId: string) => {
    setSelecting(clientId);
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    await autoSelect(clientId, token);
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center py-12 font-sans antialiased">
      <div className="w-full max-w-[480px] px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 no-underline" aria-label="HeyPass home">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-lg text-white shadow-lg shadow-[var(--hp-primary)]/25">H</div>
          <span className="text-xl font-bold tracking-tight"><span className="text-[var(--hp-primary)]">Hey</span><span className="text-[var(--hp-text)]">Pass</span></span>
        </Link>

        {/* Title */}
        <div className="text-center mb-7">
          <h1 className="text-[1.7rem] font-extrabold text-[var(--hp-text)] mb-1.5 tracking-tight">Select Organization</h1>
          <p className="text-sm text-[var(--hp-text-muted)]">Choose which organization to manage</p>
        </div>

        {/* Card */}
        <div className="hp-glass-card p-7 sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-[var(--hp-primary)] animate-spin" />
              <span className="text-[var(--hp-text-muted)] text-sm">Loading organizations...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-[var(--hp-text-muted)]" />
              </div>
              <p className="text-[var(--hp-text-muted)] text-sm mb-4">No organizations found.</p>
              <Link href="/dashboard" className="text-[var(--hp-primary)] font-semibold text-sm no-underline hover:underline">
                Continue to App &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3" role="listbox" aria-label="Select an organization">
              {clients.map(c => (
                <button
                  key={c.client_id}
                  onClick={() => selectClient(c.client_id)}
                  disabled={selecting !== null}
                  role="option"
                  aria-selected={selecting === c.client_id}
                  className="w-full p-5 text-left rounded-xl border border-[var(--hp-border)] bg-[var(--hp-surface)] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--hp-primary)]/30 hover:bg-[var(--hp-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hp-primary)]"
                >
                  <div className="font-semibold text-[var(--hp-text)] text-base flex justify-between items-center">
                    <span className="truncate">{c.name}</span>
                    {selecting === c.client_id && <Loader2 className="w-4 h-4 text-[var(--hp-primary)] animate-spin shrink-0 ml-3" />}
                  </div>
                  <div className="text-[var(--hp-text-muted)] text-xs mt-1.5 capitalize">
                    {c.role} &middot; {c.slug}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Back link */}
        <p className="text-center mt-6 text-[13px] text-[var(--hp-text-muted)]">
          <Link href="/auth/login" className="text-[var(--hp-primary)] font-semibold no-underline hover:underline">&larr; Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

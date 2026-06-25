'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-transparent flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-[480px] p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white mb-1.5 tracking-tight">Select Organization</h1>
          <p className="text-sm text-hp-text-secondary opacity-70">Choose which organization to manage</p>
        </div>

        <div className="hp-glass-card bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-[#FCA311] animate-spin" />
              <span className="text-hp-text-secondary opacity-70 text-sm">Loading organizations...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-hp-text-secondary opacity-70 text-sm mb-4">No organizations found.</p>
              <Link href="/dashboard" className="text-[#FCA311] font-semibold text-sm no-underline hover:underline">
                Continue to App →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clients.map(c => (
                <button
                  key={c.client_id}
                  onClick={() => selectClient(c.client_id)}
                  disabled={selecting !== null}
                  className="hp-glass-card w-full p-5 text-left transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/8 hover:border-[#FCA311]/30 hover:shadow-glow"
                >
                  <div className="font-semibold text-white text-base flex justify-between items-center">
                    <span>{c.name}</span>
                    {selecting === c.client_id && <Loader2 className="w-4 h-4 text-[#FCA311] animate-spin" />}
                  </div>
                  <div className="text-hp-text-secondary/60 text-xs mt-1.5 capitalize">
                    {c.role} · {c.slug}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

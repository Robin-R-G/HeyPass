'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      window.location.href = '/auth/login';
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
        localStorage.setItem('refresh_token', newTokens.refresh_token);
      }
      router.push('/dashboard');
    } catch {}
  };

  const selectClient = async (clientId: string) => {
    setSelecting(clientId);
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    await autoSelect(clientId, token);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Select Organization</h1>
          <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Choose which organization to manage</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#E5E5E5', padding: '2rem' }}>Loading...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)', borderRadius: '16px' }}>
            <p style={{ color: '#E5E5E5', marginBottom: '1rem' }}>No organizations found.</p>
            <Link href="/dashboard" style={{ color: '#FCA311', textDecoration: 'none', fontWeight: 500 }}>Continue to App ?</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clients.map(c => (
              <button key={c.client_id} onClick={() => selectClient(c.client_id)} disabled={selecting !== null} style={{
                background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.1)',
                borderRadius: '12px', padding: '1.25rem', textAlign: 'left', cursor: selecting ? 'default' : 'pointer',
                opacity: selecting && selecting !== c.client_id ? 0.5 : 1,
                transition: 'border-color 0.15s',
              }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>
                  {selecting === c.client_id ? 'Selecting...' : c.name}
                </div>
                <div style={{ color: '#888888', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {c.role} · {c.slug}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

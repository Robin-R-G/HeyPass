'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  slug: string;
}

export default function SelectClientPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { setClients(data.clients || data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectClient = async (clientId: string) => {
    try {
      await fetch('/api/auth/select-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      localStorage.setItem('client_id', clientId);
      router.push('/dashboard');
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: '#011C40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Select Organization</h1>
          <p style={{ color: '#9cb8c4', fontSize: '0.9rem' }}>Choose which organization to manage</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#9cb8c4', padding: '2rem' }}>Loading...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.08)', borderRadius: '16px' }}>
            <p style={{ color: '#9cb8c4', marginBottom: '1rem' }}>No organizations found.</p>
            <Link href="/dashboard" style={{ color: '#A7EBF2', textDecoration: 'none', fontWeight: 500 }}>Continue to Dashboard →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => selectClient(c.id)} style={{
                background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.1)',
                borderRadius: '12px', padding: '1.25rem', textAlign: 'left', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>{c.name}</div>
                <div style={{ color: '#5a7a8a', fontSize: '0.8rem', marginTop: '0.2rem' }}>{c.slug}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

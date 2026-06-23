'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, authFetch } from '@/lib/auth-client';

interface PlatformStats {
  total_clients: number;
  total_users: number;
  total_events: number;
  total_registrations: number;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plan_id: string | null;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/auth/login';
      return;
    }

    // Check superadmin status from JWT
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.is_superadmin) {
          window.location.href = '/dashboard';
          return;
        }
      }
    } catch {
      window.location.href = '/auth/login';
      return;
    }

    Promise.all([
      authFetch('/api/superadmin/stats').then(r => {
        if (r.status === 401) throw new Error('AUTH');
        return r.json();
      }),
      authFetch('/api/superadmin/clients').then(r => {
        if (r.status === 401) throw new Error('AUTH');
        return r.json();
      }),
    ])
      .then(([statsData, clientsData]) => {
        setStats(statsData.data || statsData);
        setClients(clientsData.data?.clients || clientsData.clients || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.message === 'AUTH') {
          window.location.href = '/auth/login';
          return;
        }
        setError('Failed to load platform data');
        setLoading(false);
      });
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth/login';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', borderBottom: '1px solid rgba(229,229,229,0.08)',
        background: 'rgba(20,33,61,0.6)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #FCA311, #E09800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.9rem', color: '#000',
            }}>H</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>HeyPass</span>
          </Link>
          <span style={{
            fontSize: '0.65rem', fontWeight: 600, color: '#FCA311',
            background: 'rgba(252,163,17,0.1)', padding: '0.2rem 0.5rem',
            borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Superadmin</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/superadmin" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Overview</Link>
          <button onClick={logout} style={{
            background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none',
            padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
          }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Platform Overview</h1>
          <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Manage all organizations and users across HeyPass</p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#E5E5E5' }}>Loading platform data...</div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#ef4444',
          }}>{error}</div>
        )}

        {!loading && stats && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Organizations', value: stats.total_clients || 0, icon: '🏢' },
                { label: 'Users', value: stats.total_users || 0, icon: '👥' },
                { label: 'Events', value: stats.total_events || 0, icon: '📋' },
                { label: 'Registrations', value: stats.total_registrations || 0, icon: '🎟️' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(20,33,61,0.6)', border: '1px solid rgba(229,229,229,0.08)',
                  borderRadius: '14px', padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>{s.label}</span>
                    <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#FCA311' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Organizations */}
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Organizations</h2>
              {clients.length === 0 ? (
                <div style={{
                  background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)',
                  borderRadius: '14px', padding: '3rem', textAlign: 'center', color: '#888',
                }}>
                  No organizations yet
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {clients.map(c => (
                    <div key={c.id} style={{
                      background: 'rgba(20,33,61,0.6)', border: '1px solid rgba(229,229,229,0.08)',
                      borderRadius: '14px', padding: '1.25rem 1.5rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.15rem' }}>{c.name}</div>
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>{c.slug} · Created {new Date(c.created_at).toLocaleDateString()}</div>
                      </div>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                        textTransform: 'uppercase',
                        background: c.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(229,229,229,0.1)',
                        color: c.status === 'active' ? '#10b981' : '#E5E5E5',
                      }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

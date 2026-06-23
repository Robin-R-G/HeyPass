'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getAccessToken } from '@/lib/auth-client';

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

  const [selecting, setSelecting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientSlug, setNewClientSlug] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [createError, setCreateError] = useState('');


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

    const token = getAccessToken();
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/superadmin/stats', { headers }).then(r => {
        if (!r.ok) throw new Error(`Stats API ${r.status}`);
        return r.json();
      }),
      fetch('/api/superadmin/clients', { headers }).then(r => {
        if (!r.ok) throw new Error(`Clients API ${r.status}`);
        return r.json();
      }),
    ])
      .then(([statsData, clientsData]) => {
        setStats(statsData.data || statsData);
        setClients(clientsData.data?.clients || clientsData.clients || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load platform data: ${err.message}`);
        setLoading(false);
      });
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth/login';
  };

  const selectClient = async (clientId: string) => {
    setSelecting(clientId);
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
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
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to select organization');
      }
      const newTokens = data.data?.session;
      if (newTokens?.access_token) {
        localStorage.setItem('access_token', newTokens.access_token);
        localStorage.setItem('refresh_token', newTokens.refresh_token);
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message || 'Failed to select organization');
      setSelecting(null);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientSlug) {
      setCreateError('Name and slug are required');
      return;
    }
    setCreatingClient(true);
    setCreateError('');
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClientName, slug: newClientSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to create organization');
      }

      // Refresh list
      const headers = { Authorization: `Bearer ${token}` };
      const [statsData, clientsData] = await Promise.all([
        fetch('/api/superadmin/stats', { headers }).then(r => r.json()),
        fetch('/api/superadmin/clients', { headers }).then(r => r.json()),
      ]);
      setStats(statsData.data || statsData);
      setClients(clientsData.data?.clients || clientsData.clients || []);

      setShowCreateModal(false);
      setNewClientName('');
      setNewClientSlug('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create organization');
    } finally {
      setCreatingClient(false);
    }
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Organizations</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    background: 'transparent',
                    color: '#FCA311',
                    border: '1px solid rgba(252,163,17,0.4)',
                    padding: '0.4rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(252,163,17,0.1)';
                    e.currentTarget.style.borderColor = '#FCA311';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)';
                  }}
                >
                  + Create Organization
                </button>
              </div>

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                          textTransform: 'uppercase',
                          background: c.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(229,229,229,0.1)',
                          color: c.status === 'active' ? '#10b981' : '#E5E5E5',
                        }}>{c.status}</span>
                        <button
                          onClick={() => selectClient(c.id)}
                          disabled={selecting !== null}
                          style={{
                            background: 'linear-gradient(135deg, #FCA311, #E09800)',
                            color: '#000',
                            border: 'none',
                            padding: '0.4rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: selecting ? 'default' : 'pointer',
                            fontSize: '0.8rem',
                            opacity: selecting ? 0.7 : 1,
                            transition: 'transform 0.1s',
                          }}
                          onMouseEnter={(e) => { if (!selecting) e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {selecting === c.id ? 'Accessing...' : 'Manage'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1.5rem',
        }}>
          <div style={{
            background: 'rgba(20,33,61,0.95)', border: '1px solid rgba(252,163,17,0.3)',
            borderRadius: '20px', width: '100%', maxWidth: '480px', padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Create New Organization</h3>
              <button onClick={() => { setShowCreateModal(false); setCreateError(''); }} style={{
                background: 'transparent', color: '#888', border: 'none', fontSize: '1.2rem', cursor: 'pointer',
              }}>&times;</button>
            </div>

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. IEEE Student Branch"
                  value={newClientName}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                  style={{
                    width: '100%', background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.1)',
                    borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Subdomain / URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. ieee-student"
                  value={newClientSlug}
                  onChange={(e) => setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  style={{
                    width: '100%', background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.1)',
                    borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', outline: 'none',
                  }}
                  required
                />
              </div>

              {createError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{createError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                  style={{
                    background: 'transparent', color: '#E5E5E5', border: '1px solid rgba(229,229,229,0.1)',
                    padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  style={{
                    background: 'linear-gradient(135deg, #FCA311, #E09800)',
                    color: '#000', border: 'none', fontWeight: 600,
                    padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: creatingClient ? 'default' : 'pointer',
                    fontSize: '0.85rem', opacity: creatingClient ? 0.7 : 1,
                  }}
                >
                  {creatingClient ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


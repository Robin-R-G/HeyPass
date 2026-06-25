'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAndRefreshTokens } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { Building2, Users, Calendar, Ticket, Plus, LogOut, ArrowRight, X, Loader2 } from 'lucide-react';

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
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const token = await checkAndRefreshTokens();
      if (!token) {
        router.push('/auth/login');
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.is_superadmin) {
          router.push('/dashboard');
          return;
        }
      } catch {
        router.push('/auth/login');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [statsData, clientsData] = await Promise.all([
          fetch('/api/superadmin/stats', { headers }).then(r => {
            if (!r.ok) throw new Error(`Stats API ${r.status}`);
            return r.json();
          }),
          fetch('/api/superadmin/clients', { headers }).then(r => {
            if (!r.ok) throw new Error(`Clients API ${r.status}`);
            return r.json();
          }),
        ]);
        setStats(statsData.data || statsData);
        setClients(clientsData.data?.clients || clientsData.clients || []);
        setLoading(false);
      } catch (err) {
        setError(`Failed to load platform data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/auth/login');
  };

  const selectClient = async (clientId: string) => {
    setSelecting(clientId);
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
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
      router.push('/dashboard');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to select organization', 'error');
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
      const res = await fetch('/api/superadmin/clients', {
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
      const headers = { Authorization: `Bearer ${token}` };
      const [statsData, clientsData] = await Promise.all([
        fetch('/api/superadmin/stats', { headers }).then(r => r.json()),
        fetch('/api/superadmin/clients', { headers }).then(r => r.json()),
      ]);
      setStats(statsData.data || statsData);
      setClients(clientsData.data?.clients || clientsData.data || []);
      setShowCreateModal(false);
      setNewClientName('');
      setNewClientSlug('');
      toast('Organization created successfully', 'success');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setCreatingClient(false);
    }
  };

  const statCards = stats ? [
    { label: 'Organizations', value: stats.total_clients || 0, icon: Building2, gradient: 'from-[#FCA311]/20 to-[#FCA311]/5' },
    { label: 'Users', value: stats.total_users || 0, icon: Users, gradient: 'from-blue-500/20 to-blue-500/5' },
    { label: 'Events', value: stats.total_events || 0, icon: Calendar, gradient: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Registrations', value: stats.total_registrations || 0, icon: Ticket, gradient: 'from-purple-500/20 to-purple-500/5' },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #FCA311, #E09800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '15px', color: '#000',
            }}>H</div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>HeyPass</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#FCA311',
              background: 'rgba(252,163,17,0.1)', border: '1px solid rgba(252,163,17,0.2)',
              padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>Superadmin</span>
          </Link>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            color: '#888', padding: '8px 16px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888'; }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Platform Overview
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Manage all organizations and users across HeyPass</p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '80px 0' }}>
            <Loader2 size={20} style={{ color: '#FCA311', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#888', fontSize: '14px' }}>Loading platform data...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: '12px', padding: '16px', marginBottom: '32px',
            color: '#ef4444', fontSize: '13px', textAlign: 'center',
          }}>{error}</div>
        )}

        {!loading && stats && (
          <>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '48px',
            }}>
              {statCards.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} style={{
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(252,163,17,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
                      background: `radial-gradient(circle, rgba(252,163,17,0.06) 0%, transparent 70%)`,
                      transform: 'translate(30%, -30%)',
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'rgba(252,163,17,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} style={{ color: '#FCA311' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: '#FCA311', lineHeight: 1 }}>{s.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Organizations Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Organizations</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #FCA311, #E09800)',
                    color: '#000', border: 'none',
                    padding: '10px 20px', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(252,163,17,0.25)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(252,163,17,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(252,163,17,0.25)'; }}
                >
                  <Plus size={14} strokeWidth={3} /> Create Organization
                </button>
              </div>

              {clients.length === 0 ? (
                <div style={{
                  background: '#0a0a0a', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '16px', padding: '64px 24px', textAlign: 'center',
                }}>
                  <Building2 size={40} style={{ color: '#333', margin: '0 auto 16px' }} />
                  <p style={{ color: '#555', fontSize: '14px', marginBottom: '12px' }}>No organizations yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      background: 'transparent', border: 'none', color: '#FCA311',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >Create your first organization</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clients.map(c => (
                    <div key={c.id} style={{
                      background: '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      padding: '20px 24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(252,163,17,0.15)'; e.currentTarget.style.background = '#0f0f0f'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = '#0a0a0a'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(252,163,17,0.15), rgba(252,163,17,0.05))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 800, color: '#FCA311',
                        }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{c.name}</div>
                          <div style={{ fontSize: '12px', color: '#555' }}>
                            {c.slug} · Created {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '4px 10px', borderRadius: '6px',
                          background: c.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                          color: c.status === 'active' ? '#10b981' : '#888',
                        }}>{c.status}</span>
                        <button
                          onClick={() => selectClient(c.id)}
                          disabled={selecting !== null}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: selecting === c.id ? 'rgba(252,163,17,0.3)' : 'linear-gradient(135deg, #FCA311, #E09800)',
                            color: '#000', border: 'none',
                            padding: '8px 18px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: 700,
                            cursor: selecting !== null ? 'wait' : 'pointer',
                            opacity: selecting !== null && selecting !== c.id ? 0.4 : 1,
                            transition: 'all 0.2s',
                            boxShadow: selecting === c.id ? 'none' : '0 2px 8px rgba(252,163,17,0.2)',
                          }}
                        >
                          {selecting === c.id ? (
                            <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Accessing...</>
                          ) : (
                            <><span>Manage</span> <ArrowRight size={12} /></>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={() => { setShowCreateModal(false); setCreateError(''); }}>
          <div style={{
            background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', width: '100%', maxWidth: '440px',
            padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>New Organization</h3>
              <button
                onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none',
                  color: '#666', width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#666'; }}
              ><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. IEEE Student Branch"
                  value={newClientName}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                  style={{
                    width: '100%', background: '#111',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '12px 16px',
                    color: '#fff', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Subdomain / URL Slug
                </label>
                <input
                  type="text"
                  placeholder="e.g. ieee-student"
                  value={newClientSlug}
                  onChange={(e) => setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  style={{
                    width: '100%', background: '#111',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '12px 16px',
                    color: '#fff', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  required
                />
              </div>

              {createError && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '8px', padding: '10px 14px',
                  color: '#ef4444', fontSize: '13px',
                }}>{createError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#888', padding: '10px 20px', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888'; }}
                >Cancel</button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: creatingClient ? 'rgba(252,163,17,0.3)' : 'linear-gradient(135deg, #FCA311, #E09800)',
                    color: '#000', border: 'none',
                    padding: '10px 24px', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700,
                    cursor: creatingClient ? 'wait' : 'pointer',
                    boxShadow: creatingClient ? 'none' : '0 4px 12px rgba(252,163,17,0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  {creatingClient ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

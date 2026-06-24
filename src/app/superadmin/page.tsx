'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAndRefreshTokens } from '@/lib/auth-client';

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
    const init = async () => {
      // Check and refresh token if expired
      const token = await checkAndRefreshTokens();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Check superadmin status from JWT
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
      alert(err instanceof Error ? err.message : 'Failed to select organization');
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
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setCreatingClient(false);
    }
  };


  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased relative">
      {/* Background decoration */}
      <div className="hp-bg-gradient" />

      {/* Nav */}
      <nav className="hp-nav flex justify-between items-center px-6 sm:px-8 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 no-underline focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none rounded">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-sm text-black">
              H
            </div>
            <span className="text-lg font-bold text-white">HeyPass</span>
          </Link>
          <span className="text-[10px] font-semibold text-[#FCA311] bg-[#FCA311]/10 px-2 py-0.5 rounded uppercase tracking-wider">
            Superadmin
          </span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={logout} 
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#ef4444] focus:outline-none"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1 text-white tracking-tight">Platform Overview</h1>
          <p className="text-[#888] text-sm">Manage all organizations and users across HeyPass</p>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-[#FCA311]">
              <div className="w-5 h-5 border-2 border-[#FCA311] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading platform data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4 text-center text-[#ef4444] text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Organizations', value: stats.total_clients || 0, icon: '🏢' },
                { label: 'Users', value: stats.total_users || 0, icon: '👥' },
                { label: 'Events', value: stats.total_events || 0, icon: '📋' },
                { label: 'Registrations', value: stats.total_registrations || 0, icon: '🎟️' },
              ].map(s => (
                <div key={s.label} className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 sm:p-5 hover:border-[#FCA311]/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[#888] text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
                    <span className="text-base opacity-60">{s.icon}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#FCA311]">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Organizations */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Organizations</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#FCA311] text-black hover:bg-[#E09800] px-4 py-2 rounded-lg font-semibold cursor-pointer text-xs transition-all focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none"
                >
                  + Create Organization
                </button>
              </div>

              {clients.length === 0 ? (
                <div className="bg-[#0a0a0a] border border-[#222] rounded-xl py-16 text-center">
                  <div className="text-[#888] text-sm mb-3">No organizations yet</div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-[#FCA311] hover:text-[#E09800] text-xs font-semibold cursor-pointer bg-transparent border-none transition-colors"
                  >
                    Create your first organization
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {clients.map(c => (
                    <div key={c.id} className="bg-[#0a0a0a] border border-[#222] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-[#333] transition-colors">
                      <div>
                        <div className="font-semibold text-sm sm:text-base text-white">{c.name}</div>
                        <div className="text-[#888] text-xs mt-0.5">
                          {c.slug} · Created {new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          c.status === 'active' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-white/10 text-[#888]'
                        }`}>
                          {c.status}
                        </span>
                        <button
                          onClick={() => selectClient(c.id)}
                          disabled={selecting !== null}
                          className="bg-[#FCA311] text-black font-semibold px-4 py-1.5 rounded-lg cursor-pointer text-xs disabled:opacity-50 disabled:cursor-default hover:bg-[#E09800] transition-all focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 id="modal-title" className="text-lg font-bold text-white">Create New Organization</h3>
              <button 
                onClick={() => { setShowCreateModal(false); setCreateError(''); }} 
                className="text-[#888] hover:text-white bg-transparent border-none text-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none rounded-md p-1"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="flex flex-col gap-4">
              <div>
                <label className="block text-[#888] text-[10px] font-semibold mb-1.5 uppercase tracking-wider">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. IEEE Student Branch"
                  value={newClientName}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                  className="w-full bg-[#111] border border-[#333] focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/50 rounded-lg p-3 text-white text-sm outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[#888] text-[10px] font-semibold mb-1.5 uppercase tracking-wider">Subdomain / URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. ieee-student"
                  value={newClientSlug}
                  onChange={(e) => setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  className="w-full bg-[#111] border border-[#333] focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]/50 rounded-lg p-3 text-white text-sm outline-none transition-all"
                  required
                />
              </div>

              {createError && (
                <div className="text-[#ef4444] text-xs font-medium">{createError}</div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                  className="bg-transparent text-[#888] border border-[#333] hover:bg-[#111] hover:text-white px-5 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="bg-[#FCA311] text-black font-bold px-5 py-2 rounded-lg cursor-pointer text-xs disabled:opacity-50 disabled:cursor-default hover:bg-[#E09800] transition-all focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none"
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


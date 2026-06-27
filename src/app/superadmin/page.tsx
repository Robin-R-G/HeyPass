'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAndRefreshTokens } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { Building2, Users, Calendar, Ticket, Plus, LogOut, ArrowRight, X, Loader2, UserCheck, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
    { label: 'Organizations', value: stats.total_clients || 0, icon: Building2 },
    { label: 'Users', value: stats.total_users || 0, icon: Users },
    { label: 'Events', value: stats.total_events || 0, icon: Calendar },
    { label: 'Registrations', value: stats.total_registrations || 0, icon: Ticket },
  ] : [];

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans antialiased relative">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[rgba(20,33,61,0.85)] backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-sm text-black">H</div>
            <span className="text-lg font-bold text-white">HeyPass</span>
            <span className="text-[10px] font-bold text-[#FCA311] bg-[#FCA311]/10 border border-[#FCA311]/20 px-2 py-0.5 rounded-md tracking-wider uppercase">Superadmin</span>
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#999] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 min-h-[44px]">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">
            Platform Overview
          </h1>
          <p className="text-sm text-[#999]">Manage all organizations and users across HeyPass</p>
        </div>

        {/* Quick Nav */}
        <div className="flex gap-3 mb-8">
          <Link href="/superadmin/pending" className="hp-glass-card px-5 py-3 flex items-center gap-3 no-underline hover:bg-white/[0.04] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#FCA311]/10 flex items-center justify-center">
              <UserCheck size={16} className="text-[#FCA311]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Pending Users</div>
              <div className="text-[10px] text-hp-text-secondary/60">Review registrations</div>
            </div>
          </Link>
          <Link href="/superadmin/organizations" className="hp-glass-card px-5 py-3 flex items-center gap-3 no-underline hover:bg-white/[0.04] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#FCA311]/10 flex items-center justify-center">
              <Settings size={16} className="text-[#FCA311]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">All Organizations</div>
              <div className="text-[10px] text-hp-text-secondary/60">Manage org details</div>
            </div>
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 size={24} className="text-[#FCA311] animate-spin" />
            <span className="text-[#999] text-sm">Loading platform data...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4 mb-8 text-[#ef4444] text-sm text-center">
            {error}
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {statCards.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="hp-glass-card p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#FCA311]/5 to-transparent translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-semibold text-hp-text-secondary/60 uppercase tracking-wider">{s.label}</span>
                      <div className="w-8 h-8 rounded-lg bg-[#FCA311]/8 flex items-center justify-center">
                        <Icon size={16} className="text-[#FCA311]" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-[#FCA311] leading-none">{s.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Organizations Section */}
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">Organizations</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hp-btn hp-btn-primary text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 rounded-xl cursor-pointer"
                >
                  <Plus size={14} strokeWidth={3} /> Create Organization
                </button>
              </div>

              {clients.length === 0 ? (
                <div className="hp-glass-card border-dashed border-white/10 p-16 text-center">
                  <Building2 size={40} className="text-white/20 mx-auto mb-4" />
                  <p className="text-hp-text-secondary opacity-60 text-sm mb-3">No organizations yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-transparent border-none text-[#FCA311] text-sm font-semibold cursor-pointer hover:underline"
                  >Create your first organization</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {clients.map(c => (
                    <div key={c.id} className="hp-glass-card px-6 py-5 flex items-center justify-between transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FCA311]/15 to-[#FCA311]/5 flex items-center justify-center text-lg font-extrabold text-[#FCA311]">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white mb-0.5">{c.name}</div>
                          <div className="text-xs text-hp-text-secondary/60">
                            {c.slug} · Created {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          c.status === 'active' ? 'bg-[#10b981]/12 text-[#10b981]' : 'bg-white/6 text-hp-text-secondary/60'
                        }`}>{c.status}</span>
                        <button
                          onClick={() => selectClient(c.id)}
                          disabled={selecting !== null}
                          className={`hp-btn hp-btn-primary text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer ${
                            selecting !== null ? 'opacity-40 wait' : ''
                          }`}
                        >
                          {selecting === c.id ? (
                            <><Loader2 size={12} className="animate-spin" /> Accessing...</>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>
          <div className="hp-glass-card backdrop-blur-xl border border-white/[0.12] rounded-2xl w-full max-w-[440px] p-7 sm:p-8 shadow-2xl hp-animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">New Organization</h3>
              <button
                onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-all min-h-[44px] min-w-[44px]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="flex flex-col gap-5">
              <div>
                <label htmlFor="org-name" className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-2 uppercase tracking-wider">
                  Organization Name
                </label>
                <Input
                  id="org-name"
                  aria-label="Organization Name"
                  type="text"
                  placeholder="e.g. IEEE Student Branch"
                  value={newClientName}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                  required
                />
              </div>

              <div>
                <label htmlFor="org-slug" className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-2 uppercase tracking-wider">
                  Subdomain / URL Slug
                </label>
                <Input
                  id="org-slug"
                  aria-label="Subdomain / URL Slug"
                  type="text"
                  placeholder="e.g. ieee-student"
                  value={newClientSlug}
                  onChange={(e) => setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  required
                />
              </div>

              {createError && (
                <div className="bg-[#ef4444]/8 border border-[#ef4444]/15 rounded-lg p-3 text-[#ef4444] text-xs">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3.5 mt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                  className="hp-btn hp-btn-secondary text-xs rounded-lg cursor-pointer"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className={`hp-btn hp-btn-primary text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-lg cursor-pointer ${
                    creatingClient ? 'opacity-40 wait' : ''
                  }`}
                >
                  {creatingClient ? <><Loader2 size={12} className="animate-spin" /> Creating...</> : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

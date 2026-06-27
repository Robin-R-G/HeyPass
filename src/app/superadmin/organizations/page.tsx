'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { Loader2, Building2, Users, Calendar, Ticket, ArrowLeft, Search, Eye, Trash2, Shield, Edit, Plus, X } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscription_plan: string | null;
  invitation_code: string | null;
  max_events: number;
  max_users: number;
  created_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgDetail, setOrgDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', first_name: '', last_name: '', organization_name: '', subscription_plan: 'free' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    checkSuperAdmin();
    fetchOrganizations();
  }, [router]);

  const checkSuperAdmin = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.is_superadmin) router.push('/dashboard');
    } catch { router.push('/auth/login'); }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await authFetch('/api/superadmin/clients');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.data?.clients || data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgDetail = async (orgId: string) => {
    setDetailLoading(true);
    try {
      const res = await authFetch(`/api/superadmin/organizations/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setOrgDetail(data.data || data);
        setSelectedOrg(organizations.find(o => o.id === orgId) || null);
      }
    } catch (err) {
      toast('Failed to load organization details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        toast('Organization created successfully', 'success');
        setShowCreateModal(false);
        setCreateForm({ email: '', password: '', first_name: '', last_name: '', organization_name: '', subscription_plan: 'free' });
        fetchOrganizations();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to create organization', 'error');
      }
    } catch (err) {
      toast('Failed to create organization', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSuspendOrg = async (orgId: string) => {
    if (!confirm('Are you sure you want to suspend this organization?')) return;
    try {
      const res = await authFetch(`/api/superadmin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      });
      if (res.ok) {
        toast('Organization suspended', 'success');
        fetchOrganizations();
        setSelectedOrg(null);
      }
    } catch (err) {
      toast('Failed to suspend organization', 'error');
    }
  };

  const handleActivateOrg = async (orgId: string) => {
    try {
      const res = await authFetch(`/api/superadmin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (res.ok) {
        toast('Organization activated', 'success');
        fetchOrganizations();
        setSelectedOrg(null);
      }
    } catch (err) {
      toast('Failed to activate organization', 'error');
    }
  };

  const filtered = organizations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans antialiased">
      <nav className="sticky top-0 z-50 bg-[rgba(20,33,61,0.85)] backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex justify-between items-center h-16">
          <Link href="/superadmin" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-sm text-black">H</div>
            <span className="text-lg font-bold text-white">HeyPass</span>
            <span className="text-[10px] font-bold text-[var(--hp-primary)] bg-[var(--hp-primary)]/10 border border-[var(--hp-primary)]/20 px-2 py-0.5 rounded-md tracking-wider uppercase">Superadmin</span>
          </Link>
          <Link href="/superadmin" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#999] hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">Organizations</h1>
            <p className="text-sm text-[#999]">Manage all organizations on the platform</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="hp-btn hp-btn-primary text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus size={14} /> Create Organization
          </button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
            <input type="text" placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" />
            <span className="text-[#999] text-sm">Loading organizations...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(org => (
              <div key={org.id} className="hp-glass-card px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--hp-primary)]/15 to-[var(--hp-primary)]/5 flex items-center justify-center text-lg font-extrabold text-[var(--hp-primary)]">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{org.name}</div>
                      <div className="text-xs text-hp-text-secondary/60">
                        {org.slug} · Created {new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-hp-text-secondary/40 mt-0.5">
                        Plan: {org.subscription_plan || 'free'} · Code: {org.invitation_code || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                      org.status === 'active' ? 'bg-[#10b981]/12 text-[#10b981]' :
                      org.status === 'suspended' ? 'bg-[#ef4444]/12 text-[#ef4444]' :
                      'bg-white/6 text-hp-text-secondary/60'
                    }`}>{org.status}</span>
                    <button onClick={() => fetchOrgDetail(org.id)} className="hp-btn hp-btn-primary text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Eye size={12} /> View
                    </button>
                    {org.status === 'active' ? (
                      <button onClick={() => handleSuspendOrg(org.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                        Suspend
                      </button>
                    ) : (
                      <button onClick={() => handleActivateOrg(org.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-all">
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Org Detail Modal */}
      {(selectedOrg || detailLoading) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setSelectedOrg(null)}>
          <div className="hp-glass-card backdrop-blur-xl border border-white/[0.12] rounded-2xl w-full max-w-[700px] max-h-[80vh] overflow-y-auto p-7 sm:p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">{selectedOrg?.name || 'Organization'}</h3>
              <button onClick={() => setSelectedOrg(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" />
              </div>
            ) : orgDetail ? (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Events', value: orgDetail.stats?.events || 0 },
                    { label: 'Members', value: orgDetail.stats?.members || 0 },
                    { label: 'Registrations', value: orgDetail.stats?.registrations || 0 },
                    { label: 'Tickets', value: orgDetail.stats?.tickets || 0 },
                  ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
                      <div className="text-xl font-extrabold text-[var(--hp-primary)]">{s.value}</div>
                      <div className="text-[10px] text-hp-text-secondary/60 uppercase tracking-wider mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Team Members</h4>
                  <div className="space-y-2">
                    {orgDetail.members?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--hp-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--hp-primary)]">
                            {(m.user?.first_name || m.user?.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-white">{m.user?.first_name} {m.user?.last_name}</div>
                            <div className="text-[10px] text-hp-text-secondary/60">{m.user?.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--hp-primary)] bg-[var(--hp-primary)]/10 px-2 py-0.5 rounded">
                            {m.role?.slug || 'no role'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.status === 'active' ? 'bg-[#10b981]/12 text-[#10b981]' : 'bg-white/6 text-hp-text-secondary/60'
                          }`}>{m.status}</span>
                        </div>
                      </div>
                    ))}
                    {(!orgDetail.members || orgDetail.members.length === 0) && (
                      <p className="text-xs text-[#666] text-center py-4">No members</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowCreateModal(false)}>
          <div className="hp-glass-card backdrop-blur-xl border border-white/[0.12] rounded-2xl w-full max-w-[480px] p-7 sm:p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Create Organization</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Organization Name</label>
                <input type="text" required value={createForm.organization_name} onChange={e => setCreateForm({ ...createForm, organization_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                  placeholder="e.g. IEEE Student Branch" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Owner First Name</label>
                  <input type="text" value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                    placeholder="First name" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Owner Last Name</label>
                  <input type="text" value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                    placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Owner Email</label>
                <input type="email" required value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                  placeholder="owner@example.com" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Temporary Password</label>
                <input type="password" required minLength={8} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                  placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Subscription Plan</label>
                <select value={createForm.subscription_plan} onChange={e => setCreateForm({ ...createForm, subscription_plan: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]/50">
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="hp-btn hp-btn-secondary text-xs rounded-lg">Cancel</button>
                <button type="submit" disabled={creating} className="hp-btn hp-btn-primary text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5">
                  {creating ? <><Loader2 size={12} className="animate-spin" /> Creating...</> : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

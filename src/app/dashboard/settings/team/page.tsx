'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Loader2, Users, UserPlus, Search, Filter, MoreVertical, Shield, Mail, Phone, Building, Calendar, ArrowLeft, X, Check, ChevronDown, Trash2, RefreshCw, Copy } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  status: string;
  department: string | null;
  phone: string | null;
  joined_at: string | null;
  invited_at: string | null;
  last_login_at: string | null;
  user: { id: string; email: string; first_name: string | null; last_name: string | null; avatar_url: string | null };
  role: { id: string; name: string; slug: string } | null;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priority: number;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  invitation_type: string;
  invitation_code: string | null;
  expires_at: string;
  created_at: string;
  role: { name: string; slug: string } | null;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'invitations' | 'roles'>('members');
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role_id: '', department: '', phone: '', invitation_type: 'email', message: '' });
  const [inviting, setInviting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [membersRes, rolesRes, invRes] = await Promise.all([
        authFetch('/api/team'),
        authFetch('/api/roles'),
        authFetch('/api/invitations'),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.data?.members || []);
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.data?.roles || data.roles || []);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        setInvitations(data.data?.invitations || []);
      }
    } catch (err) {
      console.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await authFetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        toast('Invitation sent successfully', 'success');
        setShowInviteModal(false);
        setInviteForm({ email: '', role_id: '', department: '', phone: '', invitation_type: 'email', message: '' });
        loadData();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to send invitation', 'error');
      }
    } catch (err) {
      toast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRoleId: string) => {
    setActionLoading(memberId);
    try {
      const res = await authFetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: newRoleId }),
      });
      if (res.ok) {
        toast('Role updated', 'success');
        loadData();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to update role', 'error');
      }
    } catch (err) {
      toast('Failed to update role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (memberId: string) => {
    const confirmed = await confirm({
      title: 'Suspend Member',
      description: 'Are you sure you want to suspend this member? They will lose access to the organization.',
      variant: 'warning',
      confirmLabel: 'Suspend',
    });
    if (!confirmed) return;
    setActionLoading(memberId);
    try {
      const res = await authFetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      });
      if (res.ok) {
        toast('Member suspended', 'success');
        loadData();
      }
    } catch (err) {
      toast('Failed to suspend member', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    const confirmed = await confirm({
      title: 'Remove Member',
      description: 'Are you sure you want to remove this member from the organization? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;
    setActionLoading(memberId);
    try {
      const res = await authFetch(`/api/team/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Member removed', 'success');
        loadData();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to remove member', 'error');
      }
    } catch (err) {
      toast('Failed to remove member', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvitation = async (invId: string) => {
    const confirmed = await confirm({
      title: 'Revoke Invitation',
      description: 'Are you sure you want to revoke this invitation? The invitee will no longer be able to join.',
      variant: 'warning',
      confirmLabel: 'Revoke',
    });
    if (!confirmed) return;
    try {
      const res = await authFetch(`/api/invitations/${invId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (res.ok) {
        toast('Invitation revoked', 'success');
        loadData();
      }
    } catch (err) {
      toast('Failed to revoke invitation', 'error');
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/auth/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast('Invite link copied', 'success');
  };

  const filteredMembers = members.filter(m =>
    m.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans antialiased">
      <ConfirmDialog />
      <nav className="sticky top-0 z-50 bg-[rgba(20,33,61,0.85)] backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-sm text-black">H</div>
            <span className="text-lg font-bold text-white">HeyPass</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#999] hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">Team Management</h1>
            <p className="text-sm text-[#999]">{members.length} members · {invitations.filter(i => i.status === 'pending').length} pending invitations</p>
          </div>
          <button onClick={() => setShowInviteModal(true)} className="hp-btn hp-btn-primary text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5">
            <UserPlus size={14} /> Invite Member
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-xl p-1 w-fit">
          {(['members', 'invitations', 'roles'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t ? 'bg-[var(--hp-primary)] text-black' : 'text-[#999] hover:text-white'
              }`}>
              {t === 'members' ? `Members (${members.length})` : t === 'invitations' ? `Invitations (${invitations.filter(i => i.status === 'pending').length})` : `Roles (${roles.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" />
            <span className="text-[#999] text-sm">Loading...</span>
          </div>
        ) : tab === 'members' ? (
          <>
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left text-[10px] font-semibold text-hp-text-secondary/60 uppercase tracking-wider px-4 py-3">Member</th>
                    <th className="text-left text-[10px] font-semibold text-hp-text-secondary/60 uppercase tracking-wider px-4 py-3">Role</th>
                    <th className="text-left text-[10px] font-semibold text-hp-text-secondary/60 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-[10px] font-semibold text-hp-text-secondary/60 uppercase tracking-wider px-4 py-3">Joined</th>
                    <th className="text-right text-[10px] font-semibold text-hp-text-secondary/60 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(member => (
                    <tr key={member.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[var(--hp-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--hp-primary)]">
                            {(member.user?.first_name || member.user?.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{member.user?.first_name} {member.user?.last_name}</div>
                            <div className="text-xs text-hp-text-secondary/60">{member.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={member.role?.id || ''} onChange={e => handleRoleChange(member.id, e.target.value)}
                          className="bg-transparent border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--hp-primary)]/50">
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-hp-text-secondary/60">
                        {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Pending'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {member.status === 'active' ? (
                            <button onClick={() => handleSuspend(member.id)} className="text-xs px-2 py-1 rounded text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                              Suspend
                            </button>
                          ) : (
                            <button onClick={() => handleRoleChange(member.id, member.role?.id || '')} className="text-xs px-2 py-1 rounded text-[#10b981] hover:bg-[#10b981]/10 transition-all">
                              Reactivate
                            </button>
                          )}
                          <button onClick={() => handleRemove(member.id)} className="text-xs px-2 py-1 rounded text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMembers.length === 0 && (
              <div className="hp-glass-card p-16 text-center">
                <Users size={40} className="text-white/20 mx-auto mb-4" />
                <p className="text-hp-text-secondary opacity-60 text-sm">{search ? 'No members match your search' : 'No team members yet'}</p>
              </div>
            )}
          </>
        ) : tab === 'invitations' ? (
          <div className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="hp-glass-card px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{inv.email}</div>
                  <div className="text-xs text-hp-text-secondary/60">
                    {inv.role?.name || 'No role'} · Sent {new Date(inv.created_at).toLocaleDateString()}
                    {inv.invitation_code && <span className="ml-2 text-[var(--hp-primary)]">Code: {inv.invitation_code}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    inv.status === 'pending' ? 'bg-[var(--hp-primary)]/12 text-[var(--hp-primary)]' :
                    inv.status === 'accepted' ? 'bg-[#10b981]/12 text-[#10b981]' :
                    'bg-white/6 text-hp-text-secondary/60'
                  }`}>{inv.status}</span>
                  {inv.status === 'pending' && (
                    <button onClick={() => handleRevokeInvitation(inv.id)} className="text-xs px-2 py-1 rounded text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
            {invitations.length === 0 && (
              <div className="hp-glass-card p-16 text-center">
                <Mail size={40} className="text-white/20 mx-auto mb-4" />
                <p className="text-hp-text-secondary opacity-60 text-sm">No invitations sent yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map(role => (
              <div key={role.id} className="hp-glass-card px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{role.name}</div>
                    <div className="text-xs text-hp-text-secondary/60">{role.description || role.slug}</div>
                  </div>
                  <div className="text-xs text-hp-text-secondary/40">Priority: {role.priority}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowInviteModal(false)}>
          <div className="hp-glass-card backdrop-blur-xl border border-white/[0.12] rounded-2xl w-full max-w-[480px] p-7 sm:p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Email *</label>
                <input type="email" required value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                  placeholder="colleague@example.com" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Role</label>
                <select value={inviteForm.role_id} onChange={e => setInviteForm({ ...inviteForm, role_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]/50">
                  <option value="">Select role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Department</label>
                  <input type="text" value={inviteForm.department} onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                    placeholder="e.g. Technical" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Phone</label>
                  <input type="text" value={inviteForm.phone} onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50"
                    placeholder="+91..." />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Invitation Type</label>
                <div className="flex gap-2">
                  {(['email', 'link', 'code'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setInviteForm({ ...inviteForm, invitation_type: type })}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        inviteForm.invitation_type === type ? 'bg-[var(--hp-primary)] text-black' : 'bg-white/[0.05] text-[#999] hover:text-white'
                      }`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-hp-text-secondary/60 mb-1.5 uppercase tracking-wider">Message (optional)</label>
                <textarea value={inviteForm.message} onChange={e => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--hp-bg-elevated)] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]/50 resize-none"
                  rows={3} placeholder="Welcome to the team!" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="hp-btn hp-btn-secondary text-xs rounded-lg">Cancel</button>
                <button type="submit" disabled={inviting} className="hp-btn hp-btn-primary text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5">
                  {inviting ? <><Loader2 size={12} className="animate-spin" /> Sending...</> : <><Mail size={12} /> Send Invitation</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

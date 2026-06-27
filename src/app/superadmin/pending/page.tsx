'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { Loader2, Users, CheckCircle, XCircle, ArrowLeft, Search, Filter, UserPlus, Shield } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  invitation_code: string | null;
  created_at: string;
  memberships: Array<{
    id: string;
    status: string;
    role: { name: string; slug: string } | null;
    client: { name: string; slug: string } | null;
  }>;
}

export default function PendingUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    checkSuperAdmin();
    fetchPendingUsers();
  }, [router]);

  const checkSuperAdmin = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.is_superadmin) {
        router.push('/dashboard');
      }
    } catch {
      router.push('/auth/login');
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await authFetch('/api/superadmin/users?status=pending');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.users || data.users || []);
      }
    } catch (err) {
      console.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await authFetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (res.ok) {
        toast('User approved successfully', 'success');
        fetchPendingUsers();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to approve user', 'error');
      }
    } catch (err) {
      toast('Failed to approve user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user?')) return;
    setActionLoading(userId);
    try {
      const res = await authFetch(`/api/superadmin/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('User rejected', 'success');
        fetchPendingUsers();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to reject user', 'error');
      }
    } catch (err) {
      toast('Failed to reject user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans antialiased">
      <nav className="sticky top-0 z-50 bg-[rgba(20,33,61,0.85)] backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex justify-between items-center h-16">
          <Link href="/superadmin" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-sm text-black">H</div>
            <span className="text-lg font-bold text-white">HeyPass</span>
            <span className="text-[10px] font-bold text-[#FCA311] bg-[#FCA311]/10 border border-[#FCA311]/20 px-2 py-0.5 rounded-md tracking-wider uppercase">Superadmin</span>
          </Link>
          <Link href="/superadmin" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#999] hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">Pending Users</h1>
          <p className="text-sm text-[#999]">Review and approve new user registrations</p>
        </div>

        {/* Search */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#14213D] border border-white/[0.08] rounded-xl text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#FCA311]/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 size={24} className="text-[#FCA311] animate-spin" />
            <span className="text-[#999] text-sm">Loading pending users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="hp-glass-card p-16 text-center">
            <Users size={40} className="text-white/20 mx-auto mb-4" />
            <p className="text-hp-text-secondary opacity-60 text-sm">
              {search ? 'No users match your search' : 'No pending users'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => (
              <div key={user.id} className="hp-glass-card px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FCA311]/15 to-[#FCA311]/5 flex items-center justify-center text-lg font-extrabold text-[#FCA311]">
                      {(user.first_name || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {user.first_name} {user.last_name || user.email}
                      </div>
                      <div className="text-xs text-hp-text-secondary/60">{user.email}</div>
                      <div className="text-xs text-hp-text-secondary/40 mt-0.5">
                        Registered {new Date(user.created_at).toLocaleDateString()}
                        {user.memberships?.[0]?.client && (
                          <span className="ml-2 text-[#FCA311]">
                            via {user.memberships[0].client.name}
                          </span>
                        )}
                        {user.invitation_code && (
                          <span className="ml-2 text-[#FCA311]">
                            Code: {user.invitation_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={actionLoading === user.id}
                      className="hp-btn hp-btn-primary text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={actionLoading === user.id}
                      className="text-xs font-bold px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

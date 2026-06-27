'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAndRefreshTokens } from '@/lib/auth-client';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { Loader2, ArrowLeft, Plus, Edit3, Trash2, Power, X, CreditCard, Zap } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  type: 'subscription' | 'single_event';
  price_monthly: number;
  price_annual: number;
  price_per_event: number;
  event_registration_limit: number;
  commission_rate: number;
  max_events: number;
  max_registrations: number;
  max_team_members: number;
  features: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function SuperAdminPlansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    type: 'subscription' as 'subscription' | 'single_event',
    price_monthly: 0,
    price_annual: 0,
    price_per_event: 0,
    event_registration_limit: 100,
    commission_rate: 2.5,
    max_events: 3,
    max_registrations: 100,
    max_team_members: 5,
    features: '',
    display_order: 0,
  });

  useEffect(() => {
    const init = async () => {
      const token = await checkAndRefreshTokens();
      if (!token) { router.push('/auth/login'); return; }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.is_superadmin) { router.push('/dashboard'); return; }
      } catch { router.push('/auth/login'); return; }
      fetchPlans();
    };
    init();
  }, [router]);

  async function fetchPlans() {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/superadmin/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      toast('Failed to load plans', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({
      name: '', slug: '', type: 'subscription',
      price_monthly: 0, price_annual: 0, price_per_event: 0,
      event_registration_limit: 100, commission_rate: 2.5,
      max_events: 3, max_registrations: 100, max_team_members: 5,
      features: '', display_order: plans.length + 1,
    });
    setEditingPlan(null);
    setShowForm(true);
  }

  function openEdit(plan: Plan) {
    setForm({
      name: plan.name,
      slug: plan.slug,
      type: plan.type,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      price_per_event: plan.price_per_event || 0,
      event_registration_limit: plan.event_registration_limit || 100,
      commission_rate: plan.commission_rate,
      max_events: plan.max_events,
      max_registrations: plan.max_registrations,
      max_team_members: plan.max_team_members,
      features: (plan.features || []).join('\n'),
      display_order: plan.display_order,
    });
    setEditingPlan(plan);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.slug) {
      toast('Name and slug are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const body = { ...form, features: form.features.split('\n').filter(f => f.trim()) };

      const url = editingPlan ? `/api/superadmin/plans/${editingPlan.id}` : '/api/superadmin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || 'Failed to save plan', 'error');
        return;
      }
      toast(editingPlan ? 'Plan updated' : 'Plan created', 'success');
      setShowForm(false);
      setEditingPlan(null);
      fetchPlans();
    } catch {
      toast('Failed to save plan', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/superadmin/plans/${confirmDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast('Plan deactivated', 'success');
      setConfirmDelete(null);
      fetchPlans();
    } catch {
      toast('Failed to deactivate plan', 'error');
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/superadmin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      fetchPlans();
    } catch {
      toast('Failed to toggle plan', 'error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--hp-bg)] flex items-center justify-center">
        <Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--hp-bg)] text-white font-sans antialiased">
      <nav className="sticky top-0 z-50 hp-nav border-b border-[var(--hp-border)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-[var(--hp-text-muted)] hover:text-white transition-colors no-underline">
              <ArrowLeft size={14} /> Platform
            </Link>
            <span className="text-[var(--hp-text-muted)]">/</span>
            <span className="text-sm font-medium text-white">Subscription Plans</span>
          </div>
          <button onClick={() => router.push('/auth/login')} className="text-sm text-[var(--hp-text-muted)] hover:text-[var(--hp-error)] transition-colors">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Subscription Plans</h1>
            <p className="text-sm text-[var(--hp-text-muted)] mt-1">Manage platform-wide subscription and single-event plans</p>
          </div>
          <button onClick={openCreate} className="hp-btn hp-btn-primary flex items-center gap-2">
            <Plus size={14} /> Create Plan
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {plans.map(plan => (
            <div key={plan.id} className={`hp-glass-card p-5 relative ${!plan.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{plan.name}</span>
                    {!plan.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold">Inactive</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--hp-text-muted)] font-mono">{plan.slug}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--hp-primary)]/10 text-[var(--hp-primary)] font-semibold uppercase">
                  {plan.type === 'single_event' ? 'Event' : 'Subscription'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {plan.type === 'subscription' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[var(--hp-text-muted)]">Monthly</span>
                      <span className="font-semibold">₹{plan.price_monthly.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--hp-text-muted)]">Annual</span>
                      <span className="font-semibold">₹{plan.price_annual.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[var(--hp-text-muted)]">Per Event</span>
                      <span className="font-semibold">₹{plan.price_per_event.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--hp-text-muted)]">Registration Limit</span>
                      <span className="font-semibold">{plan.event_registration_limit.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--hp-text-muted)]">Commission</span>
                  <span className="font-semibold">{plan.commission_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--hp-text-muted)]">Max Events</span>
                  <span className="font-semibold">{plan.max_events === -1 ? 'Unlimited' : plan.max_events}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--hp-text-muted)]">Max Registrations</span>
                  <span className="font-semibold">{plan.max_registrations.toLocaleString()}</span>
                </div>
              </div>

              {plan.features && plan.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {plan.features.map(f => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--hp-text-muted)]">{f}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                <button onClick={() => openEdit(plan)} className="hp-btn hp-btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5">
                  <Edit3 size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(plan)} className="hp-btn hp-btn-secondary text-xs flex items-center justify-center gap-1.5">
                  <Power size={12} /> {plan.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setConfirmDelete(plan.id)} className="hp-btn hp-btn-secondary text-xs text-red-400 flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="hp-glass-card p-12 text-center">
            <CreditCard size={32} className="text-[var(--hp-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--hp-text-muted)]">No plans yet. Create your first plan to get started.</p>
          </div>
        )}
      </main>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="bg-[#111827] border border-white/[0.08] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h3>
              <button onClick={() => setShowForm(false)} className="text-[var(--hp-text-muted)] hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Slug</label>
                  <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} disabled={!!editingPlan} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)] disabled:opacity-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Plan Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'subscription' | 'single_event' })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]">
                  <option value="subscription">Subscription (Monthly/Annual)</option>
                  <option value="single_event">Single Event</option>
                </select>
              </div>

              {form.type === 'subscription' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Monthly (₹)</label>
                    <input type="number" value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Annual (₹)</label>
                    <input type="number" value={form.price_annual} onChange={e => setForm({ ...form, price_annual: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Per Event (₹)</label>
                    <input type="number" value={form.price_per_event} onChange={e => setForm({ ...form, price_per_event: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Registration Limit</label>
                    <input type="number" value={form.event_registration_limit} onChange={e => setForm({ ...form, event_registration_limit: parseInt(e.target.value) || 100 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Commission (%)</label>
                  <input type="number" step="0.1" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Display Order</label>
                  <input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                </div>
              </div>

              {form.type === 'subscription' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Max Events</label>
                    <input type="number" value={form.max_events} onChange={e => setForm({ ...form, max_events: parseInt(e.target.value) || -1 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Max Registrations</label>
                    <input type="number" value={form.max_registrations} onChange={e => setForm({ ...form, max_registrations: parseInt(e.target.value) || -1 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Max Team</label>
                    <input type="number" value={form.max_team_members} onChange={e => setForm({ ...form, max_team_members: parseInt(e.target.value) || -1 })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--hp-text-muted)] mb-1.5 uppercase tracking-wider">Features (one per line)</label>
                <textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} rows={4} placeholder={"all_events\nwhite_label\nanalytics\napi_access"} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white font-mono placeholder-[var(--hp-text-muted)] focus:outline-none focus:border-[var(--hp-primary)] resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="hp-btn hp-btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="hp-btn hp-btn-primary flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Deactivate Plan"
        message="This plan will be deactivated. Existing subscriptions will remain active but no new subscriptions can use this plan."
        confirmLabel="Deactivate"
        variant="warning"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

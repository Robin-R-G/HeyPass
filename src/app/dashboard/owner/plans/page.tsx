'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_annual: number;
  commission_rate: number;
  max_events: number;
  max_registrations: number;
  max_team_members: number;
  features: string[];
  is_active: boolean;
  display_order: number;
}

export default function OwnerPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    price_monthly: 0,
    price_annual: 0,
    commission_rate: 2.5,
    max_events: 3,
    max_registrations: 100,
    max_team_members: 5,
    features: '',
    display_order: 0,
  });

  useEffect(() => { fetchPlans(); }, []);

  async function fetchPlans() {
    try {
      const res = await fetch('/api/owner/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({
      name: '',
      slug: '',
      price_monthly: 0,
      price_annual: 0,
      commission_rate: 2.5,
      max_events: 3,
      max_registrations: 100,
      max_team_members: 5,
      features: '',
      display_order: plans.length + 1,
    });
    setShowCreate(true);
  }

  function openEdit(plan: Plan) {
    setForm({
      name: plan.name,
      slug: plan.slug,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      commission_rate: plan.commission_rate,
      max_events: plan.max_events,
      max_registrations: plan.max_registrations,
      max_team_members: plan.max_team_members,
      features: plan.features.join('\n'),
      display_order: plan.display_order,
    });
    setEditingPlan(plan);
  }

  async function handleCreate() {
    if (!form.name || !form.slug) {
      alert('Name and slug are required');
      return;
    }

    try {
      const res = await fetch('/api/owner/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          features: form.features.split('\n').filter(f => f.trim()),
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        fetchPlans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create plan');
      }
    } catch (err) {
      alert('Failed to create plan');
    }
  }

  async function handleUpdate() {
    if (!editingPlan) return;

    try {
      const res = await fetch(`/api/owner/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          features: form.features.split('\n').filter(f => f.trim()),
        }),
      });

      if (res.ok) {
        setEditingPlan(null);
        fetchPlans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update plan');
      }
    } catch (err) {
      alert('Failed to update plan');
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm('Deactivate this plan?')) return;

    try {
      await fetch(`/api/owner/plans/${planId}`, { method: 'DELETE' });
      fetchPlans();
    } catch (err) {
      alert('Failed to delete plan');
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      await fetch(`/api/owner/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      fetchPlans();
    } catch (err) {
      alert('Failed to toggle plan');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Subscription Plans</h1>
        <Button onClick={openCreate}>Create Plan</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No plans yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Annual</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.display_order}</TableCell>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>₹{plan.price_monthly.toLocaleString()}</TableCell>
                    <TableCell>₹{plan.price_annual.toLocaleString()}</TableCell>
                    <TableCell>{plan.commission_rate}%</TableCell>
                    <TableCell>{plan.max_events === -1 ? '∞' : plan.max_events}</TableCell>
                    <TableCell>{plan.max_registrations === -1 ? '∞' : plan.max_registrations.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(plan)}>
                          {plan.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
          </DialogHeader>
          <PlanForm form={form} setForm={setForm} onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
          </DialogHeader>
          <PlanForm form={form} setForm={setForm} onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({ form, setForm, onSubmit, isEdit }: {
  form: any;
  setForm: (f: any) => void;
  onSubmit: () => void;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={isEdit} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Price Monthly (₹)</Label>
          <Input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Price Annual (₹)</Label>
          <Input type="number" value={form.price_annual} onChange={(e) => setForm({ ...form, price_annual: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Commission Rate (%)</Label>
          <Input type="number" step="0.1" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Display Order</Label>
          <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Max Events (-1 = unlimited)</Label>
          <Input type="number" value={form.max_events} onChange={(e) => setForm({ ...form, max_events: parseInt(e.target.value) || -1 })} />
        </div>
        <div className="space-y-2">
          <Label>Max Registrations</Label>
          <Input type="number" value={form.max_registrations} onChange={(e) => setForm({ ...form, max_registrations: parseInt(e.target.value) || -1 })} />
        </div>
        <div className="space-y-2">
          <Label>Max Team Members</Label>
          <Input type="number" value={form.max_team_members} onChange={(e) => setForm({ ...form, max_team_members: parseInt(e.target.value) || -1 })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Features (one per line)</Label>
        <Textarea
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          rows={6}
          placeholder="all_events&#10;white_label&#10;analytics&#10;api_access"
        />
      </div>

      <Button onClick={onSubmit} className="w-full">{isEdit ? 'Update Plan' : 'Create Plan'}</Button>
    </div>
  );
}

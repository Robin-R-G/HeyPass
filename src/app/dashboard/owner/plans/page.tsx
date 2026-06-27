'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
}

export default function OwnerPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground">Plan management is handled by the platform admin.</p>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Annual</TableHead>
                  <TableHead>Per Event</TableHead>
                  <TableHead>Reg Limit</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.display_order}</TableCell>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell><Badge variant="outline">{plan.type}</Badge></TableCell>
                    <TableCell>₹{plan.price_monthly.toLocaleString()}</TableCell>
                    <TableCell>₹{plan.price_annual.toLocaleString()}</TableCell>
                    <TableCell>₹{plan.price_per_event.toLocaleString()}</TableCell>
                    <TableCell>{plan.event_registration_limit.toLocaleString()}</TableCell>
                    <TableCell>{plan.commission_rate}%</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlanForm() {
  return null;
}

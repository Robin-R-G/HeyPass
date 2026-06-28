'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_annual: number;
  commission_rate: number;
  max_events: number;
  max_registrations: number;
  features: string[];
}

interface Subscription {
  id: string;
  plan_id: string;
  billing_cycle: string;
  status: string;
  current_period_end: string;
  plan?: SubscriptionPlan;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  total: number;
  due_date: string | null;
  created_at: string;
}

interface Gateway {
  id: string;
  provider: string;
  is_live: boolean;
  is_active: boolean;
  verified_at: string | null;
}

export default function BillingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [subRes, invRes, gwRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/invoices?limit=10'),
        fetch('/api/billing/gateways'),
      ]);

      const subData = await subRes.json();
      const invData = await invRes.json();
      const gwData = await gwRes.json();

      setPlans(subData.plans || []);
      setSubscription(subData.subscription);
      setInvoices(invData.invoices || []);
      setGateways(gwData.gateways || []);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    try {
      const res = await fetch('/api/billing/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
      });
      const data = await res.json();
      if (data.subscription) {
        toast('Subscription updated!', 'success');
        fetchData();
      }
    } catch (err) {
      toast('Failed to update subscription', 'error');
    }
  }

  async function downloadInvoice(invoiceId: string) {
    window.open(`/api/billing/invoices/${invoiceId}/pdf`, '_blank');
  }

  function getProviderName(provider: string) {
    return provider === 'razorpay' ? 'Razorpay' : 'Cashfree';
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': case 'paid': return 'default';
      case 'past_due': case 'overdue': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading billing...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Billing & Subscription</h1>

      <Tabs defaultValue="subscription">
        <TabsList className="gap-1 bg-[#111] border border-[#222] p-1">
          <TabsTrigger value="subscription" className="data-[state=active]:bg-[var(--hp-primary)] data-[state=active]:text-black">Subscription</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-[var(--hp-primary)] data-[state=active]:text-black">Invoices</TabsTrigger>
          <TabsTrigger value="gateways" className="data-[state=active]:bg-[var(--hp-primary)] data-[state=active]:text-black">Payment Gateways</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan */}
          {subscription && subscription.plan && (
            <Card className="border-[var(--hp-primary)]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Plan: {subscription.plan.name}</span>
                  <Badge variant={getStatusColor(subscription.status)}>{subscription.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Price</div>
                    <div className="font-bold">
                      ₹{billingCycle === 'monthly' ? subscription.plan.price_monthly.toLocaleString() : subscription.plan.price_annual.toLocaleString()}
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Commission</div>
                    <div className="font-bold">{subscription.plan.commission_rate}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Events</div>
                    <div className="font-bold">{subscription.plan.max_events === -1 ? 'Unlimited' : subscription.plan.max_events}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Registrations</div>
                    <div className="font-bold">{subscription.plan.max_registrations === -1 ? 'Unlimited' : subscription.plan.max_registrations.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Renews: {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Selection */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium">Billing Cycle:</span>
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBillingCycle('annual')}
            >
              Annual (20% off)
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {plans.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_annual;
              const isCurrent = subscription?.plan_id === plan.id;

              return (
                <Card key={plan.id} className={isCurrent ? 'border-[var(--hp-primary)]' : ''}>
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      ₹{price.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Commission:</span> {plan.commission_rate}%
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Events:</span> {plan.max_events === -1 ? 'Unlimited' : plan.max_events}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Registrations:</span> {plan.max_registrations === -1 ? 'Unlimited' : plan.max_registrations.toLocaleString()}
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i}>• {f.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                    {!isCurrent && price > 0 && (
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        Subscribe
                      </Button>
                    )}
                    {isCurrent && (
                      <Badge className="w-full justify-center" variant="outline">Current Plan</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No invoices yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                        <TableCell><Badge variant="outline">{inv.type}</Badge></TableCell>
                        <TableCell>₹{inv.total.toLocaleString()}</TableCell>
                        <TableCell><Badge variant={getStatusColor(inv.status)}>{inv.status}</Badge></TableCell>
                        <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => downloadInvoice(inv.id)}>
                            Download PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gateways Tab */}
        <TabsContent value="gateways">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Gateways</CardTitle>
              <Button onClick={() => router.push('/dashboard/settings/billing/gateways')}>
                Configure
              </Button>
            </CardHeader>
            <CardContent>
              {gateways.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment gateways configured. Add Razorpay or Cashfree to accept payments.
                </div>
              ) : (
                <div className="space-y-3">
                  {gateways.map((gw) => (
                    <div key={gw.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{getProviderName(gw.provider)}</div>
                        <div className="text-sm text-muted-foreground">
                          {gw.is_live ? 'Live Mode' : 'Test Mode'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {gw.verified_at ? (
                          <Badge variant="default">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Not Verified</Badge>
                        )}
                        <Badge variant={gw.is_active ? 'default' : 'secondary'}>
                          {gw.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

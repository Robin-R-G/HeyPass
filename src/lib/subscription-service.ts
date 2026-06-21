import { supabaseAdmin } from '@/lib/supabase/client';

export interface SubscriptionPlan {
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

export interface ClientSubscription {
  id: string;
  client_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'annual';
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  plan?: SubscriptionPlan;
  created_at: string;
}

export interface EventSubscription {
  id: string;
  client_id: string;
  event_id: string;
  plan_id: string;
  status: string;
  purchased_at: string;
  expires_at: string | null;
  registration_limit: number;
  registrations_used: number;
  amount_paid: number;
  payment_reference: string | null;
  plan?: SubscriptionPlan;
  created_at: string;
}

class SubscriptionServiceImpl {
  async listPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getSubscription(clientId: string): Promise<ClientSubscription | null> {
    const { data, error } = await supabaseAdmin
      .from('client_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      plan: (data as any).subscription_plans,
    };
  }

  async createSubscription(clientId: string, planId: string, billingCycle: 'monthly' | 'annual'): Promise<ClientSubscription> {
    // Check existing active subscription
    const existing = await this.getSubscription(clientId);
    if (existing && existing.status === 'active') {
      throw new Error('Client already has an active subscription. Change plan instead.');
    }

    const plan = await this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const { data, error } = await supabaseAdmin
      .from('client_subscriptions')
      .insert({
        client_id: clientId,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select('*, subscription_plans(*)')
      .single();

    if (error) throw error;

    return {
      ...data,
      plan: (data as any).subscription_plans,
    };
  }

  async changePlan(clientId: string, newPlanId: string): Promise<ClientSubscription> {
    const current = await this.getSubscription(clientId);
    if (!current || current.status !== 'active') {
      throw new Error('No active subscription to change');
    }

    const newPlan = await this.getPlan(newPlanId);
    if (!newPlan) throw new Error('Plan not found');

    // Upgrade/downgrade - prorate based on remaining time
    const { data, error } = await supabaseAdmin
      .from('client_subscriptions')
      .update({
        plan_id: newPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select('*, subscription_plans(*)')
      .single();

    if (error) throw error;

    return {
      ...data,
      plan: (data as any).subscription_plans,
    };
  }

  async cancelSubscription(clientId: string, reason?: string): Promise<void> {
    const current = await this.getSubscription(clientId);
    if (!current || current.status !== 'active') {
      throw new Error('No active subscription to cancel');
    }

    const { error } = await supabaseAdmin
      .from('client_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id);

    if (error) throw error;
  }

  async checkLimits(clientId: string): Promise<{
    events: { used: number; limit: number; allowed: boolean };
    registrations: { used: number; limit: number; allowed: boolean };
    team: { used: number; limit: number; allowed: boolean };
  }> {
    const subscription = await this.getSubscription(clientId);
    const plan = subscription?.plan;

    const [eventsCount, regsCount, teamCount] = await Promise.all([
      supabaseAdmin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .is('deleted_at', null),
      supabaseAdmin
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .is('deleted_at', null),
      supabaseAdmin
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId),
    ]);

    const eventLimit = plan?.max_events ?? 3;
    const regLimit = plan?.max_registrations ?? 100;
    const teamLimit = plan?.max_team_members ?? 5;

    return {
      events: {
        used: eventsCount.count || 0,
        limit: eventLimit,
        allowed: eventLimit === -1 || (eventsCount.count || 0) < eventLimit,
      },
      registrations: {
        used: regsCount.count || 0,
        limit: regLimit,
        allowed: regLimit === -1 || (regsCount.count || 0) < regLimit,
      },
      team: {
        used: teamCount.count || 0,
        limit: teamLimit,
        allowed: teamLimit === -1 || (teamCount.count || 0) < teamLimit,
      },
    };
  }

  async getUsage(clientId: string) {
    const limits = await this.checkLimits(clientId);
    const subscription = await this.getSubscription(clientId);

    return {
      subscription,
      limits,
      is_trial: subscription?.status === 'trial',
      is_active: subscription?.status === 'active',
    };
  }

  // ===== SINGLE EVENT SUBSCRIPTIONS =====

  async listSingleEventPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('type', 'single_event')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async purchaseEventPlan(clientId: string, eventId: string, planId: string, paymentReference?: string): Promise<EventSubscription> {
    // Check if event already has an active subscription
    const { data: existing } = await supabaseAdmin
      .from('event_subscriptions')
      .select('id')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('status', 'active')
      .single();

    if (existing) {
      throw new Error('Event already has an active plan. Cancel existing first.');
    }

    const plan = await this.getPlan(planId);
    if (!plan || plan.type !== 'single_event') {
      throw new Error('Invalid single-event plan');
    }

    const { data, error } = await supabaseAdmin
      .from('event_subscriptions')
      .insert({
        client_id: clientId,
        event_id: eventId,
        plan_id: planId,
        status: 'active',
        registration_limit: plan.event_registration_limit,
        amount_paid: plan.price_per_event,
        payment_reference: paymentReference || null,
      })
      .select('*, subscription_plans(*)')
      .single();

    if (error) throw error;

    return {
      ...data,
      plan: (data as any).subscription_plans,
    };
  }

  async getEventSubscription(clientId: string, eventId: string): Promise<EventSubscription | null> {
    const { data, error } = await supabaseAdmin
      .from('event_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('status', 'active')
      .single();

    if (error || !data) return null;

    return {
      ...data,
      plan: (data as any).subscription_plans,
    };
  }

  async checkEventLimits(clientId: string, eventId: string): Promise<{
    has_plan: boolean;
    registrations: { used: number; limit: number; allowed: boolean };
    plan?: SubscriptionPlan;
  }> {
    const eventSub = await this.getEventSubscription(clientId, eventId);

    if (!eventSub) {
      return {
        has_plan: false,
        registrations: { used: 0, limit: 0, allowed: false },
      };
    }

    return {
      has_plan: true,
      registrations: {
        used: eventSub.registrations_used,
        limit: eventSub.registration_limit,
        allowed: eventSub.registrations_used < eventSub.registration_limit,
      },
      plan: eventSub.plan,
    };
  }

  async incrementEventRegistrations(clientId: string, eventId: string): Promise<void> {
    await supabaseAdmin
      .from('event_subscriptions')
      .update({ registrations_used: supabaseAdmin.rpc ? 0 : 0 }) // placeholder
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('status', 'active');

    // Use raw increment
    const { data } = await supabaseAdmin
      .from('event_subscriptions')
      .select('registrations_used')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('status', 'active')
      .single();

    if (data) {
      await supabaseAdmin
        .from('event_subscriptions')
        .update({ registrations_used: data.registrations_used + 1, updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .eq('status', 'active');
    }
  }
}

export const subscriptionService = new SubscriptionServiceImpl();

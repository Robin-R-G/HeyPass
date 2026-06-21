import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  price_monthly: z.number().min(0),
  price_annual: z.number().min(0),
  commission_rate: z.number().min(0).max(100),
  max_events: z.number().min(-1),
  max_registrations: z.number().min(-1),
  max_team_members: z.number().min(-1),
  features: z.array(z.string()),
  is_active: z.boolean().optional(),
  display_order: z.number().optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      // Only owner can manage plans
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role_slug')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single();

      if (membership?.role_slug !== 'owner') {
        return NextResponse.json({ error: 'Only owners can manage plans' }, { status: 403 });
      }

      const { data: plans, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ plans: plans || [] });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role_slug')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single();

      if (membership?.role_slug !== 'owner') {
        return NextResponse.json({ error: 'Only owners can create plans' }, { status: 403 });
      }

      const body = await req.json();
      const parsed = planSchema.parse(body);

      const { data: plan, error } = await supabaseAdmin
        .from('subscription_plans')
        .insert(parsed)
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ plan }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

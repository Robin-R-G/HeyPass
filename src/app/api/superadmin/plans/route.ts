import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  type: z.enum(['subscription', 'single_event']).default('subscription'),
  price_monthly: z.number().min(0),
  price_annual: z.number().min(0),
  price_per_event: z.number().min(0).optional(),
  event_registration_limit: z.number().min(0).optional(),
  commission_rate: z.number().min(0).max(100),
  max_events: z.number().min(-1),
  max_registrations: z.number().min(-1),
  max_team_members: z.number().min(-1),
  features: z.array(z.string()),
  is_active: z.boolean().optional(),
  display_order: z.number().optional(),
});

function checkSuperAdmin(req: NextRequest): boolean {
  const header = req.headers.get('x-is-superadmin');
  return header === 'true';
}

export async function GET(request: NextRequest) {
  if (!checkSuperAdmin(request)) {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
  }

  try {
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ plans: plans || [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkSuperAdmin(request)) {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
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
}

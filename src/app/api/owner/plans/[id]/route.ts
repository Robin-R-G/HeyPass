import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price_monthly: z.number().min(0).optional(),
  price_annual: z.number().min(0).optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  max_events: z.number().min(-1).optional(),
  max_registrations: z.number().min(-1).optional(),
  max_team_members: z.number().min(-1).optional(),
  features: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().optional(),
});

async function checkOwner(userId: string, clientId: string) {
  const { data } = await supabaseAdmin
    .from('memberships')
    .select('role_slug')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .single();

  return data?.role_slug === 'owner';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;

      const { data: plan, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      return NextResponse.json({ plan });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      if (!await checkOwner(userId, clientId)) {
        return NextResponse.json({ error: 'Only owners can update plans' }, { status: 403 });
      }

      const { id } = await params;
      const body = await req.json();
      const parsed = updateSchema.parse(body) as any;

      const { data: plan, error } = await supabaseAdmin
        .from('subscription_plans')
        .update(parsed)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ plan });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      if (!await checkOwner(userId, clientId)) {
        return NextResponse.json({ error: 'Only owners can delete plans' }, { status: 403 });
      }

      const { id } = await params;

      // Soft delete - just deactivate
      const { error } = await supabaseAdmin
        .from('subscription_plans')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

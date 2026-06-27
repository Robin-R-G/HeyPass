import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

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

// PUT removed — plan editing is restricted to superadmin only.
// See /api/superadmin/plans/[id] for plan management.

// DELETE removed — plan deletion is restricted to superadmin only.
// See /api/superadmin/plans/[id] for plan management.

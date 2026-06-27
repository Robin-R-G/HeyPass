import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { data: membership } = await supabaseAdmin
        .from('client_memberships')
        .select('role:roles(slug)')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single();

      if ((membership?.role as any)?.slug !== 'owner') {
        return NextResponse.json({ error: 'Only owners can view plans' }, { status: 403 });
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

// POST removed — plan creation is restricted to superadmin only.
// See /api/superadmin/plans for plan management.

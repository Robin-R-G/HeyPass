import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse(401, 'Authorization required');
    }

    const token = authHeader.substring(7);
    const payload = await verifyAccessToken(token);
    
    if (!payload || !payload.sub) {
      return createErrorResponse(401, 'Invalid token');
    }

    const userId = payload.sub;

    const { data: memberships, error } = await supabaseAdmin
      .from('client_memberships')
      .select(`
        id,
        status,
        created_at,
        client:clients(name, slug),
        role:roles(name, slug)
      `)
      .eq('user_id', userId)
      .eq('status', 'invited')
      .is('deleted_at', null);

    if (error) {
      return createErrorResponse(500, 'Failed to fetch membership status');
    }

    if (!memberships || memberships.length === 0) {
      const { data: activeMembership } = await supabaseAdmin
        .from('client_memberships')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (activeMembership) {
        return createSuccessResponse({ status: 'active' });
      }

      return createErrorResponse(404, 'No pending membership found');
    }

    const membership = memberships[0];
    const client = membership.client as any;
    const role = membership.role as any;

    return createSuccessResponse({
      status: membership.status,
      id: membership.id,
      organization_name: client?.name || 'Unknown Organization',
      organization_slug: client?.slug,
      role_name: role?.name || 'Pending',
      created_at: membership.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
}

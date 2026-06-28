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
    const clientId = payload.client_id;

    if (!clientId) {
      return createSuccessResponse({ permissions: [], role: null });
    }

    const { data: membership } = await supabaseAdmin
      .from('client_memberships')
      .select(`
        role:roles(
          id,
          name,
          slug,
          role_permissions(
            permission:permissions(name)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    if (!membership) {
      return createSuccessResponse({ permissions: [], role: null });
    }

    const role = membership.role as any;
    const permissions = (role?.role_permissions || [])
      .map((rp: any) => rp.permission?.name)
      .filter(Boolean);

    return createSuccessResponse({
      permissions,
      role: role?.slug || null,
      role_name: role?.name || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
}

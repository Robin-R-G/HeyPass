import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);
    if (!token) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return createErrorResponse(401, 'Invalid token');
    }

    const { data: memberships, error } = await supabaseAdmin
      .from('client_memberships')
      .select(`
        id,
        client_id,
        role_id,
        status,
        clients!inner ( id, name, slug, logo_url, status ),
        roles!inner ( id, name, slug, priority )
      `)
      .eq('user_id', payload.sub)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) {
      return createErrorResponse(500, error.message);
    }

    return createSuccessResponse({
      clients: (memberships || []).map((m: any) => ({
        client_id: m.client_id,
        name: m.clients?.name,
        slug: m.clients?.slug,
        logo_url: m.clients?.logo_url,
        role: m.roles?.slug,
        role_name: m.roles?.name,
        membership_id: m.id,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
}

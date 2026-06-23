import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);
    if (!token) return createErrorResponse(401, 'Unauthorized');

    const payload = verifyAccessToken(token);
    if (!payload) return createErrorResponse(401, 'Invalid token');
    if (!payload.is_superadmin) return createErrorResponse(403, 'Superadmin access required');

    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return createErrorResponse(500, error.message);

    return createSuccessResponse({ clients: clients || [] });
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
}

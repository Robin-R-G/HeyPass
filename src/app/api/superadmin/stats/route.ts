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

    const [clients, users, events, registrations] = await Promise.all([
      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabaseAdmin.from('events').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabaseAdmin.from('registrations').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ]);

    return createSuccessResponse({
      total_clients: clients.count || 0,
      total_users: users.count || 0,
      total_events: events.count || 0,
      total_registrations: registrations.count || 0,
    });
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
}

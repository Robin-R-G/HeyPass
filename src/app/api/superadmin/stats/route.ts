import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.is_superadmin) {
      return createErrorResponse(403, 'Superadmin access required');
    }

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
});

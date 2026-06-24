import { NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, successResponse } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { createAuditLog } from '@/lib/audit';

// GET /api/clients — List user's clients
export const GET = withAuth(async (_req: NextRequest, auth) => {
  const { data: memberships } = await supabase
    .from('client_memberships')
    .select(`
      id,
      status,
      role_id,
      joined_at,
      client:clients (
        id,
        name,
        slug,
        logo_url,
        primary_color,
        status
      ),
      role:roles (
        id,
        name,
        slug,
        priority
      )
    `)
    .eq('user_id', auth.userId)
    .eq('status', 'active')
    .is('deleted_at', null);

  return successResponse({ clients: memberships || [] });
});

// POST /api/clients — Create a new client (available to all authenticated users)
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return createErrorResponse(400, 'Name and slug are required');
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({ name, slug })
      .select()
      .single();

    if (clientError) {
      return createErrorResponse(400, clientError.message);
    }

    // Fetch the seeded owner role for this client
    const { data: ownerRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('client_id', client.id)
      .eq('slug', 'owner')
      .single();

    const { error: memberError } = await supabaseAdmin
      .from('client_memberships')
      .insert({
        client_id: client.id,
        user_id: auth.userId,
        role_id: ownerRole?.id || null,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      await supabaseAdmin.from('clients').delete().eq('id', client.id);
      return createErrorResponse(500, 'Failed to add owner');
    }

    await createAuditLog({
      user_id: auth.userId,
      client_id: client.id,
      action: 'auth.register',
      resource_type: 'client',
      resource_id: client.id,
      new_value: { name, slug },
    });

    return createSuccessResponse({ client }, 201);
  } catch {
    return createErrorResponse(500, 'Internal server error');
  }
});

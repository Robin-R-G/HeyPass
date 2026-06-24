import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.is_superadmin) {
      return createErrorResponse(403, 'Superadmin access required');
    }

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
});

export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.is_superadmin) {
      return createErrorResponse(403, 'Superadmin access required');
    }

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

    return createSuccessResponse({ client }, 201);
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
});

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { createAuditLog } from '@/lib/audit';

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.is_superadmin) {
      return createErrorResponse(403, 'Superadmin access required');
    }

    const { data: orgsWithoutAdmin, error } = await supabaseAdmin
      .rpc('get_organizations_without_admin');

    if (error) {
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select(`
          id, name, slug, status, invitation_code, created_at,
          memberships:client_memberships(
            id, user_id, status,
            role:roles(slug)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const filtered = (clients || []).filter((client: any) => {
        const hasOwner = client.memberships?.some(
          (m: any) => m.role?.slug === 'owner' && m.status === 'active'
        );
        return !hasOwner;
      });

      return createSuccessResponse({ organizations: filtered });
    }

    return createSuccessResponse({ organizations: orgsWithoutAdmin || [] });
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
});

export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.is_superadmin) {
      return createErrorResponse(403, 'Superadmin access required');
    }

    const { organization_id, user_id } = await req.json();

    if (!organization_id || !user_id) {
      return createErrorResponse(400, 'organization_id and user_id are required');
    }

    const { data: existingMembership } = await supabaseAdmin
      .from('client_memberships')
      .select('id')
      .eq('client_id', organization_id)
      .eq('user_id', user_id)
      .is('deleted_at', null)
      .single();

    if (existingMembership) {
      return createErrorResponse(400, 'User is already a member of this organization');
    }

    const { data: ownerRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('client_id', organization_id)
      .eq('slug', 'owner')
      .single();

    const { error: memberError } = await supabaseAdmin
      .from('client_memberships')
      .insert({
        client_id: organization_id,
        user_id,
        role_id: ownerRole?.id || null,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      return createErrorResponse(500, 'Failed to assign admin');
    }

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', organization_id)
      .single();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', user_id)
      .single();

    await createAuditLog({
      user_id: auth.userId,
      client_id: organization_id,
      action: 'org.admin_create',
      resource_type: 'client',
      resource_id: organization_id,
      new_value: { assigned_user_id: user_id, assigned_user_email: user?.email },
    });

    return createSuccessResponse({
      message: 'Admin assigned successfully',
      organization: client,
      user: { id: user_id, email: user?.email },
    });
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
});

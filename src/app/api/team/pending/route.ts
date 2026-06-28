import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth, withPermission } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { createAuditLog } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    const { data: pendingMembers, error } = await supabaseAdmin
      .from('client_memberships')
      .select(`
        id,
        status,
        department,
        phone,
        invited_at,
        created_at,
        user:users(id, email, first_name, last_name, avatar_url),
        role:roles(id, name, slug),
        client:clients(id, name, slug),
        inviter:invited_by(id, email, first_name, last_name)
      `)
      .eq('status', 'invited')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return createErrorResponse(500, 'Failed to fetch pending members');
    }

    const filteredMembers = (pendingMembers || []).filter((member: any) => {
      if (auth.is_superadmin) return true;
      
      if (!auth.clientId) return false;
      
      return member.client?.id === auth.clientId;
    });

    return createSuccessResponse({ members: filteredMembers });
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
});

export const PATCH = withPermission(async (req: NextRequest, auth) => {
  try {
    const { membership_id, action, role_id, notes } = await req.json();

    if (!membership_id || !action) {
      return createErrorResponse(400, 'membership_id and action are required');
    }

    if (!['approve', 'reject'].includes(action)) {
      return createErrorResponse(400, 'action must be "approve" or "reject"');
    }

    const { data: membership, error: fetchError } = await supabaseAdmin
      .from('client_memberships')
      .select(`
        id,
        status,
        user_id,
        client_id,
        role_id,
        user:users(id, email, first_name, last_name),
        client:clients(id, name),
        role:roles(id, name, slug)
      `)
      .eq('id', membership_id)
      .eq('status', 'invited')
      .is('deleted_at', null)
      .single();

    if (fetchError || !membership) {
      return createErrorResponse(404, 'Pending membership not found');
    }

    if (!auth.is_superadmin && membership.client_id !== auth.clientId) {
      return createErrorResponse(403, 'Not authorized to manage this membership');
    }

    if (action === 'approve') {
      const { error: updateError } = await supabaseAdmin
        .from('client_memberships')
        .update({
          status: 'active',
          role_id: role_id || membership.role_id,
          joined_at: new Date().toISOString(),
        })
        .eq('id', membership_id);

      if (updateError) {
        return createErrorResponse(500, 'Failed to approve membership');
      }

      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ status: 'active' })
        .eq('id', membership.user_id);

      if (userError) {
        console.error('Failed to update user status:', userError);
      }

      await createAuditLog({
        user_id: auth.userId,
        client_id: membership.client_id,
        action: 'member.update',
        resource_type: 'membership',
        resource_id: membership_id,
        old_value: { status: 'invited' },
        new_value: { status: 'active', role_id: role_id || membership.role_id },
      });

      return createSuccessResponse({
        message: 'Member approved successfully',
        membership_id,
        status: 'active',
      });
    } else {
      const { error: updateError } = await supabaseAdmin
        .from('client_memberships')
        .update({
          status: 'suspended',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', membership_id);

      if (updateError) {
        return createErrorResponse(500, 'Failed to reject membership');
      }

      await createAuditLog({
        user_id: auth.userId,
        client_id: membership.client_id,
        action: 'member.remove',
        resource_type: 'membership',
        resource_id: membership_id,
        old_value: { status: 'invited', user_id: membership.user_id },
        new_value: { status: 'rejected', notes },
      });

      return createSuccessResponse({
        message: 'Member rejected',
        membership_id,
        status: 'rejected',
      });
    }
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
}, PERMISSIONS.USERS_EDIT);

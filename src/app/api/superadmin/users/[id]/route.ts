import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, extractAuthPayload } from '@/lib/route-guard';
import { supabase } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';

// GET /api/superadmin/users/[id] - Get user detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    try {
      const auth = extractAuthPayload(req);
      if (!auth?.is_superadmin) return errorResponse('Forbidden', 403);

      const { id } = await params;

      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id, email, first_name, last_name, avatar_url, status,
          is_superadmin, created_at, last_login_at, invitation_code,
          phone, email_verified_at
        `)
        .eq('id', id)
        .single();

      if (error || !user) return errorResponse('User not found', 404);

      // Get memberships
      const { data: memberships } = await supabase
        .from('client_memberships')
        .select(`
          id, status, department, phone, joined_at, invited_at, last_login_at,
          role:roles(id, name, slug),
          client:clients(id, name, slug, status)
        `)
        .eq('user_id', id)
        .is('deleted_at', null);

      // Get recent audit logs
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      return successResponse({
        user,
        memberships: memberships || [],
        audit_logs: auditLogs || [],
      });
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

// PATCH /api/superadmin/users/[id] - Update user (superadmin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    try {
      const auth = extractAuthPayload(req);
      if (!auth?.is_superadmin) return errorResponse('Forbidden', 403);

      const { id } = await params;
      const body = await req.json();
      const { status, is_superadmin, first_name, last_name } = body;

      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (is_superadmin !== undefined) updates.is_superadmin = is_superadmin;
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;

      if (Object.keys(updates).length === 0) {
        return errorResponse('No updates provided');
      }

      const { data: user, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return errorResponse(error.message, 400);

      await createAuditLog({
        user_id: userId,
        action: 'user.admin_update',
        resource_type: 'user',
        resource_id: id,
        new_value: updates,
      });

      return successResponse({ user });
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

// DELETE /api/superadmin/users/[id] - Soft delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    try {
      const auth = extractAuthPayload(req);
      if (!auth?.is_superadmin) return errorResponse('Forbidden', 403);

      const { id } = await params;

      // Prevent self-deletion
      if (id === userId) {
        return errorResponse('Cannot delete your own account');
      }

      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
        .eq('id', id);

      if (error) return errorResponse(error.message, 400);

      await createAuditLog({
        user_id: userId,
        action: 'user.admin_delete',
        resource_type: 'user',
        resource_id: id,
      });

      return successResponse({ deleted: true });
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, extractAuthPayload } from '@/lib/route-guard';
import { supabase } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';

// GET /api/superadmin/organizations/[id] - Get org detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    try {
      const auth = extractAuthPayload(req);
      if (!auth?.is_superadmin) return errorResponse('Forbidden', 403);

      const { id } = await params;

      const { data: org, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !org) return errorResponse('Organization not found', 404);

      const { data: members } = await supabase
        .from('client_memberships')
        .select(`
          id, status, department, joined_at, invited_at,
          user:users(id, email, first_name, last_name, avatar_url),
          role:roles(name, slug)
        `)
        .eq('client_id', id)
        .is('deleted_at', null);

      const [eventsCount, registrationsCount, ticketsCount] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('client_id', id).is('deleted_at', null),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('client_id', id),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', id),
      ]);

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      return successResponse({
        organization: org,
        members: members || [],
        stats: {
          events: eventsCount.count || 0,
          registrations: registrationsCount.count || 0,
          tickets: ticketsCount.count || 0,
          members: members?.length || 0,
        },
        audit_logs: auditLogs || [],
      });
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

// PATCH /api/superadmin/organizations/[id] - Update org
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
      const { status, subscription_plan, name, max_events, max_users } = body;

      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan;
      if (name !== undefined) updates.name = name;
      if (max_events !== undefined) updates.max_events = max_events;
      if (max_users !== undefined) updates.max_users = max_users;

      if (Object.keys(updates).length === 0) {
        return errorResponse('No updates provided');
      }

      const { data: org, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return errorResponse(error.message, 400);

      await createAuditLog({
        user_id: userId,
        client_id: id,
        action: 'org.admin_update',
        resource_type: 'client',
        resource_id: id,
        new_value: updates,
      });

      return successResponse({ organization: org });
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

// DELETE /api/superadmin/organizations/[id] - Soft delete org
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    try {
      const auth = extractAuthPayload(req);
      if (!auth?.is_superadmin) return errorResponse('Forbidden', 403);

      const { id } = await params;

      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString(), status: 'deactivated' })
        .eq('id', id);

      if (error) return errorResponse(error.message, 400);

      await createAuditLog({
        user_id: userId,
        action: 'org.admin_delete',
        resource_type: 'client',
        resource_id: id,
      });

      return successResponse({ deleted: true });
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

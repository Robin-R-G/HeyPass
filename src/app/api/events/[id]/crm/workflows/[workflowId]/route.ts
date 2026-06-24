import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; workflowId: string }> }) {
  try {
    const { id: eventId, workflowId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name, trigger_type, trigger_config, actions, is_active } = body;

    const { data: workflow, error } = await supabaseAdmin
      .from('crm_workflows')
      .update({
        name,
        trigger_type,
        trigger_config,
        actions,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('client_id', auth.clientId)
      .eq('id', workflowId)
      .select('*')
      .single();

    if (error) throw error;
    return successResponse({ workflow });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; workflowId: string }> }) {
  try {
    const { id: eventId, workflowId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_DELETE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const { error } = await supabaseAdmin
      .from('crm_workflows')
      .delete()
      .eq('client_id', auth.clientId)
      .eq('id', workflowId);

    if (error) throw error;
    return successResponse({ success: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

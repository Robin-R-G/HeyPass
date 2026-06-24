import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    // Fetch workflows
    const { data: workflows, error } = await supabaseAdmin
      .from('crm_workflows')
      .select('*')
      .eq('client_id', auth.clientId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch executions/runs for log dashboard
    const { data: runs } = await supabaseAdmin
      .from('crm_workflow_runs')
      .select(`
        *,
        contact:crm_contacts(name)
      `)
      .eq('client_id', auth.clientId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50);

    return successResponse({ workflows: workflows || [], runs: runs || [] });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name, triggerType, triggerConfig = {}, actions = [] } = body;

    if (!name || !triggerType || actions.length === 0) {
      return errorResponse('name, triggerType, and actions are required');
    }

    const { data: workflow, error } = await supabaseAdmin
      .from('crm_workflows')
      .insert({
        client_id: auth.clientId,
        event_id: eventId,
        name,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        actions,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return successResponse({ workflow }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

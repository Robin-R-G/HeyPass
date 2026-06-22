import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';
import { eventCloneService } from '@/lib/event-clone-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');

    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const guard = await requirePermission(req, PERMISSIONS.EVENTS_CLONE);
    if (!guard.allowed) {
      return errorResponse('Forbidden', 403);
    }

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, title')
      .eq('id', id)
      .eq('client_id', auth.clientId)
      .single();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await req.json().catch(() => ({}));

    const options = {
      includeSessions: body.include_sessions !== false,
      includeForms: body.include_forms !== false,
      includeTickets: body.include_tickets !== false,
      includeGates: body.include_gates !== false,
      includeNotifications: body.include_notifications !== false,
      includeCoupons: body.include_coupons !== false,
      includeBranding: body.include_branding !== false,
    };

    const result = await eventCloneService.cloneEvent(
      id,
      auth.clientId,
      auth.userId,
      options
    );

    return successResponse({ ...result, source_title: event.title }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

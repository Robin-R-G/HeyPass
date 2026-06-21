import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { emergencyService } from '@/lib/emergency-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; incidentId: string } }
) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const timeline = await emergencyService.getIncidentTimeline(auth.clientId, params.incidentId);
    return successResponse({ timeline });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; incidentId: string } }
) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENT_MANAGE_STAFF);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    if (!body.action) return errorResponse('action is required');

    const entry = await emergencyService.addIncidentTimeline(
      auth.clientId,
      params.incidentId,
      body.action,
      body.notes || null,
      auth.userId
    );
    return successResponse({ entry }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

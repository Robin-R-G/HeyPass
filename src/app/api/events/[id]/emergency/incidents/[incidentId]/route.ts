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

    const incidents = await emergencyService.getIncidents(auth.clientId, params.id);
    const incident = incidents.find((i) => i.id === params.incidentId);
    if (!incident) return errorResponse('Incident not found', 404);

    return successResponse({ incident });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function PATCH(
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
    const incident = await emergencyService.updateIncident(auth.clientId, params.incidentId, {
      status: body.status,
      severity: body.severity,
      assigned_to: body.assigned_to,
      description: body.description,
      location: body.location,
    });
    return successResponse({ incident });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

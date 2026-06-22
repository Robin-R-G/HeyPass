import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { emergencyService } from '@/lib/emergency-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const severity = url.searchParams.get('severity') || undefined;
    const type = url.searchParams.get('type') || undefined;

    const incidents = await emergencyService.getIncidents(auth.clientId, id, {
      status,
      severity,
      incident_type: type,
    });
    return successResponse({ incidents });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENT_MANAGE_STAFF);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    if (!body.title || !body.incident_type) {
      return errorResponse('title and incident_type are required');
    }

    const incident = await emergencyService.createIncident(auth.clientId, id, {
      incident_type: body.incident_type,
      severity: body.severity,
      title: body.title,
      description: body.description,
      location: body.location,
      reported_by: body.reported_by || auth.userId,
      assigned_to: body.assigned_to,
    });
    return successResponse({ incident }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

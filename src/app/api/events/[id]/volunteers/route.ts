import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { volunteerService } from '@/lib/volunteer-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const volunteers = await volunteerService.listVolunteers(auth.clientId, params.id);
    return successResponse({ volunteers });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { application_id, status, assigned_user_id } = body;
    if (!application_id || !status) return errorResponse('application_id and status are required');

    const volunteer = await volunteerService.updateVolunteerStatus(
      auth.clientId, auth.userId, application_id, status, assigned_user_id
    );
    return successResponse({ volunteer });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

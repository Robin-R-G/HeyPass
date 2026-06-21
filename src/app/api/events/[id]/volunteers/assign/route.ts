import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { volunteerService } from '@/lib/volunteer-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { task_id, application_id } = body;
    if (!task_id || !application_id) return errorResponse('task_id and application_id are required');

    const assignment = await volunteerService.assignVolunteer(
      auth.clientId, params.id, auth.userId, task_id, application_id
    );
    return successResponse({ assignment }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const { assignment_id } = await req.json();
    if (!assignment_id) return errorResponse('assignment_id is required');

    await volunteerService.unassignVolunteer(auth.clientId, auth.userId, assignment_id);
    return successResponse({ deleted: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

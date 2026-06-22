import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { volunteerService } from '@/lib/volunteer-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { assignment_id, action } = body;
    if (!assignment_id || !action) return errorResponse('assignment_id and action are required');
    if (!['check_in', 'check_out'].includes(action)) return errorResponse('action must be check_in or check_out');

    let result;
    if (action === 'check_in') {
      result = await volunteerService.checkInVolunteer(auth.clientId, id, auth.userId, assignment_id);
    } else {
      result = await volunteerService.checkOutVolunteer(auth.clientId, id, auth.userId, assignment_id);
    }

    return successResponse({ assignment: result });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

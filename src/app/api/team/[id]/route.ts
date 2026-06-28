import { NextRequest } from 'next/server';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { teamService } from '@/lib/team-service';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/team/[id] - Get member detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    if (!clientId) return errorResponse('No client context', 403);

    const { id } = await params;
    const member = await teamService.getMember(clientId, id);

    if (!member) return errorResponse('Member not found', 404);

    return successResponse({ member });
  });
}

// PATCH /api/team/[id] - Update member (role, department, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(req, async (req, userId, clientId) => {
    if (!clientId) return errorResponse('No client context', 403);

    const { id } = await params;
    const body = await req.json();

    const member = await teamService.updateMember(clientId, id, body, userId);
    return successResponse({ member });
  }, PERMISSIONS.USERS_EDIT);
}

// DELETE /api/team/[id] - Remove member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(req, async (req, userId, clientId) => {
    if (!clientId) return errorResponse('No client context', 403);

    const { id } = await params;
    await teamService.removeMember(clientId, id, userId);

    return successResponse({ removed: true });
  }, PERMISSIONS.USERS_REMOVE);
}

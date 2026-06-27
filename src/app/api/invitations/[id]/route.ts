import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { invitationService } from '@/lib/invitation-service';

// PATCH /api/invitations/[id] - Revoke invitation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    if (!clientId) return errorResponse('No client context', 403);

    const { id } = await params;
    const body = await req.json();

    if (body.action === 'revoke') {
      await invitationService.revokeInvitation(id, clientId, userId);
      return successResponse({ revoked: true });
    }

    return errorResponse('Invalid action');
  });
}

// DELETE /api/invitations/[id] - Delete invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, userId, clientId) => {
    if (!clientId) return errorResponse('No client context', 403);

    const { id } = await params;
    await invitationService.deleteInvitation(id, clientId);

    return successResponse({ deleted: true });
  });
}

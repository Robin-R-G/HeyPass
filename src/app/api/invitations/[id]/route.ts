import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { invitationService } from '@/lib/invitation-service';
import { requirePermission } from '@/lib/permissions';

// PATCH /api/invitations/[id] - Revoke invitation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission(req, 'users.remove' as any);
  if (!guard.allowed) {
    return errorResponse(guard.error || 'Forbidden', guard.status);
  }

  const auth = guard.auth!;
  const { id } = await params;
  const body = await req.json();

  if (body.action === 'revoke') {
    await invitationService.revokeInvitation(id, auth.clientId!, auth.userId);
    return successResponse({ revoked: true });
  }

  return errorResponse('Invalid action');
}

// DELETE /api/invitations/[id] - Delete invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission(req, 'users.remove' as any);
  if (!guard.allowed) {
    return errorResponse(guard.error || 'Forbidden', guard.status);
  }

  const auth = guard.auth!;
  const { id } = await params;
  await invitationService.deleteInvitation(id, auth.clientId!);

  return successResponse({ deleted: true });
}

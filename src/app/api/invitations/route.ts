import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { invitationService } from '@/lib/invitation-service';

// GET /api/invitations - List invitations
export const GET = withAuth(async (req: NextRequest, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const result = await invitationService.getInvitations(auth.clientId, {
    status, page, limit,
  });

  return successResponse(result);
});

// POST /api/invitations - Create invitation
export const POST = withAuth(async (req: NextRequest, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const body = await req.json();
  const { email, role_id, department, phone, invitation_type, message, expiry_days } = body;

  if (!email) return errorResponse('Email is required');

  const invitation = await invitationService.createInvitation({
    client_id: auth.clientId,
    email,
    role_id,
    department,
    phone,
    invitation_type: invitation_type || 'email',
    message,
    invited_by: auth.userId,
    expiry_days,
  });

  return successResponse({ invitation }, 201);
});

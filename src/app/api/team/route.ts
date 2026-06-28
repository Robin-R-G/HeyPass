import { NextRequest } from 'next/server';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { teamService } from '@/lib/team-service';
import { invitationService } from '@/lib/invitation-service';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/team - List team members
export const GET = withAuth(async (req: NextRequest, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;
  const role_id = searchParams.get('role_id') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const result = await teamService.getMembers(auth.clientId, {
    status, search, role_id, page, limit,
  });

  return successResponse(result);
});

// POST /api/team - Invite team member
export const POST = withPermission(async (req: NextRequest, auth) => {
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
}, PERMISSIONS.USERS_INVITE);

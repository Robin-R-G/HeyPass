import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { invitationService } from '@/lib/invitation-service';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/auth';

// POST /api/invitations/accept - Accept invitation (requires auth)
export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return errorResponse('Invalid token', 401);
    }

    const { invitation_token } = await req.json();
    if (!invitation_token) {
      return errorResponse('Invitation token is required');
    }

    const result = await invitationService.acceptInvitation(invitation_token, payload.sub);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

// GET /api/invitations/accept?token=xxx - Get invitation details (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return errorResponse('Token is required');
    }

    const invitation = await invitationService.getInvitationByToken(token);
    if (!invitation) {
      return errorResponse('Invalid or expired invitation', 404);
    }

    // Return limited info (no sensitive data)
    return successResponse({
      email: invitation.email,
      department: invitation.department,
      expires_at: invitation.expires_at,
      invitation_type: invitation.invitation_type,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

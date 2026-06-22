import { NextRequest } from 'next/server';
import { logoutUser } from '@/lib/auth-service';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);
    const clientId = req.headers.get('x-client-id') || undefined;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        await logoutUser(
          payload.sub,
          clientId || payload.client_id || undefined,
          req.headers.get('x-forwarded-for') || undefined,
          req.headers.get('user-agent') || undefined
        );
      }
    }

    return createSuccessResponse({ message: 'Signed out successfully' });
  } catch {
    return createErrorResponse(500, 'Internal server error');
  }
}

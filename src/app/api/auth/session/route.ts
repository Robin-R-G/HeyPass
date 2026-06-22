import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth-service';
import { extractTokenFromHeader } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);

    if (!token) {
      return createErrorResponse(401, 'No token provided');
    }

    const context = await getSession(token);

    if (!context) {
      return createErrorResponse(401, 'Invalid or expired token');
    }

    return createSuccessResponse({
      user: context.user,
      client_id: context.clientId,
      role: context.roleSlug,
    });
  } catch {
    return createErrorResponse(500, 'Internal server error');
  }
}

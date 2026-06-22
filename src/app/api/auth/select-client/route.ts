import { NextRequest } from 'next/server';
import { authenticateWithClient } from '@/lib/auth-service';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);
    if (!token) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return createErrorResponse(401, 'Invalid token');
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return createErrorResponse(400, 'client_id is required');
    }

    const result = await authenticateWithClient(
      payload.sub,
      client_id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return createSuccessResponse({
      session: result.tokens,
      role: result.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(403, message);
  }
}

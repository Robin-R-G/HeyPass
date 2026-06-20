import { NextRequest } from 'next/server';
import { refreshAccessToken } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const { refresh_token } = await req.json();

    if (!refresh_token) {
      return createErrorResponse(400, 'refresh_token is required');
    }

    const result = await refreshAccessToken(
      refresh_token,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return createSuccessResponse({ session: result.tokens });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(401, message);
  }
}

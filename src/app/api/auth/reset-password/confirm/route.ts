import { NextRequest } from 'next/server';
import { resetPassword } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const { user_id, token, password } = await req.json();

    if (!user_id || !token || !password) {
      return createErrorResponse(400, 'user_id, token, and password are required');
    }

    if (password.length < 8) {
      return createErrorResponse(400, 'Password must be at least 8 characters');
    }

    await resetPassword(
      user_id,
      token,
      password,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return createSuccessResponse({ message: 'Password reset successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(400, message);
  }
}

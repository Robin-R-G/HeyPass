import { NextRequest } from 'next/server';
import { resetPassword, extractClientIP } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { checkRateLimit } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 password reset attempts per minute per IP
    const ip = extractClientIP(req.headers.get('x-forwarded-for'));
    if (ip) {
      const { allowed } = await checkRateLimit(`auth:reset-confirm:ip:${ip}`, 5, 60);
      if (!allowed) {
        return createErrorResponse(429, 'Too many password reset attempts. Please try again later.');
      }
    }

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
      ip,
      req.headers.get('user-agent') || undefined
    );

    return createSuccessResponse({ message: 'Password reset successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(400, message);
  }
}

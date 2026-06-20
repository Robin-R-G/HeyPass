import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required');
    }

    const result = await authenticateUser({
      email,
      password,
      ip_address: req.headers.get('x-forwarded-for') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

    return createSuccessResponse({
      user: result.user,
      session: result.tokens,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Too many') ? 429 :
                   message.includes('locked') ? 423 :
                   message.includes('Invalid') ? 401 : 500;
    return createErrorResponse(status, message);
  }
}

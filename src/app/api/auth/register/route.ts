import { NextRequest } from 'next/server';
import { registerUser } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, first_name, last_name } = body;

    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required');
    }

    const result = await registerUser({
      email,
      password,
      first_name,
      last_name,
    });

    return createSuccessResponse({
      user: result.user,
      session: result.tokens,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('already exists') ? 409 :
                   message.includes('Too many') ? 429 :
                   message.includes('Password') ? 400 : 500;
    return createErrorResponse(status, message);
  }
}

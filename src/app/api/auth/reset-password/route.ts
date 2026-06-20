import { NextRequest } from 'next/server';
import { requestPasswordReset } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return createErrorResponse(400, 'Email is required');
    }

    await requestPasswordReset(
      email,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    // Always return success to prevent email enumeration
    return createSuccessResponse({ message: 'If the email exists, a reset link has been sent' });
  } catch {
    return createErrorResponse(500, 'Internal server error');
  }
}

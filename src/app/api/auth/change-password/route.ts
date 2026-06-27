import { NextRequest } from 'next/server';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { createAuditLog } from '@/lib/audit';

// POST /api/auth/change-password - Force password change
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

    const { new_password } = await req.json();
    if (!new_password) {
      return createErrorResponse(400, 'New password is required');
    }

    if (new_password.length < 8) {
      return createErrorResponse(400, 'Password must be at least 8 characters');
    }
    if (!/[a-z]/.test(new_password) || !/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return createErrorResponse(400, 'Password must contain uppercase, lowercase, and a number');
    }

    // Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      payload.sub,
      { password: new_password }
    );

    if (authError) {
      return createErrorResponse(400, authError.message);
    }

    // Update password_changed_at
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ password_changed_at: new Date().toISOString() })
      .eq('id', payload.sub);

    if (profileError) {
      return createErrorResponse(400, profileError.message);
    }

    await createAuditLog({
      user_id: payload.sub,
      action: 'auth.password_change',
      resource_type: 'user',
      resource_id: payload.sub,
    });

    return createSuccessResponse({ message: 'Password updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
}

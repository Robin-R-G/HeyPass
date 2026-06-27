import { NextRequest } from 'next/server';
import { registerUser, extractClientIP } from '@/lib/auth-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { checkRateLimit } from '@/lib/cache';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 registrations per minute per IP
    const ip = extractClientIP(req.headers.get('x-forwarded-for'));
    if (ip) {
      const { allowed } = await checkRateLimit(`auth:register:ip:${ip}`, 3, 60);
      if (!allowed) {
        return createErrorResponse(429, 'Too many registration attempts. Please try again later.');
      }
    }

    const body = await req.json();
    const { email, password, first_name, last_name, invitation_code } = body;

    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required');
    }

    const result = await registerUser({
      email,
      password,
      first_name,
      last_name,
    });

    // If invitation code provided, associate user with organization
    if (invitation_code && result.user) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('invitation_code', invitation_code.toUpperCase())
        .is('deleted_at', null)
        .single();

      if (client) {
        // Get the participant role for this client
        const { data: role } = await supabaseAdmin
          .from('roles')
          .select('id')
          .eq('client_id', client.id)
          .eq('slug', 'participant')
          .single();

        // Create pending membership
        await supabaseAdmin.from('client_memberships').insert({
          client_id: client.id,
          user_id: result.user.id,
          role_id: role?.id || null,
          status: 'invited',
          invited_at: new Date().toISOString(),
        });

        // Update user status to pending
        await supabaseAdmin
          .from('users')
          .update({ status: 'pending', invitation_code: invitation_code.toUpperCase() })
          .eq('id', result.user.id);
      }
    }

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

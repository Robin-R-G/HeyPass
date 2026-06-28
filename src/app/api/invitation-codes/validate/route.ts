import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return createErrorResponse(400, 'Invitation code is required');
    }

    const normalizedCode = code.toUpperCase().trim();

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('id, name, slug, status, invitation_code')
      .eq('invitation_code', normalizedCode)
      .is('deleted_at', null)
      .single();

    if (error || !client) {
      return createSuccessResponse({ valid: false, error: 'Invalid invitation code' });
    }

    if (client.status !== 'active') {
      return createSuccessResponse({ valid: false, error: 'This organization is currently unavailable' });
    }

    return createSuccessResponse({
      valid: true,
      organization_id: client.id,
      organization_name: client.name,
      organization_slug: client.slug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
}

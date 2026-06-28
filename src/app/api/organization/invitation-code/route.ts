import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.clientId) {
      return createErrorResponse(400, 'No organization context');
    }

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, invitation_code')
      .eq('id', auth.clientId)
      .is('deleted_at', null)
      .single();

    if (!client) {
      return createErrorResponse(404, 'Organization not found');
    }

    return createSuccessResponse({
      invitation_code: client.invitation_code,
      organization_name: client.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
});

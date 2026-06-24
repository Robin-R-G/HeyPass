import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    if (!auth.is_superadmin) {
      return createErrorResponse(403, 'Superadmin access required');
    }

    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return createErrorResponse(500, error.message);

    return createSuccessResponse({ clients: clients || [] });
  } catch (error) {
    return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
  }
});

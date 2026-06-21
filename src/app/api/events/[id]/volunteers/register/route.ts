import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';
import { volunteerService } from '@/lib/volunteer-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, client_id, title, is_public')
      .eq('id', params.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!event) return errorResponse('Event not found', 404);
    if (!event.is_public) return errorResponse('Event is not accepting applications', 403);

    const body = await req.json();
    const result = await volunteerService.registerVolunteer(params.id, event.client_id, body);

    return successResponse({ application: result }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_COMMUNICATE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { subject, message, volunteer_ids } = body;
    if (!subject || !message) return errorResponse('subject and message are required');

    let query = supabaseAdmin
      .from('volunteer_applications')
      .select('email, first_name, last_name')
      .eq('client_id', auth.clientId)
      .eq('event_id', params.id)
      .eq('status', 'approved');

    if (volunteer_ids && Array.isArray(volunteer_ids)) {
      query = query.in('id', volunteer_ids);
    }

    const { data: volunteers } = await query;

    if (!volunteers || volunteers.length === 0) {
      return errorResponse('No volunteers found');
    }

    const notifications = volunteers.map((v) => ({
      client_id: auth.clientId,
      event_id: params.id,
      recipient_email: v.email,
      recipient_name: `${v.first_name} ${v.last_name}`,
      type: 'volunteer_communication',
      subject,
      body: message,
      status: 'pending',
    }));

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw new Error(`Failed to queue messages: ${error.message}`);

    return successResponse({ queued: data?.length || 0 });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

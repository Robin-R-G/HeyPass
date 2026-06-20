import { supabase } from '@/lib/supabase/client';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import type { NextRequest } from 'next/server';

// GET /api/sessions/[id] — Get single sub-event
export const GET = withAuth(async (req: NextRequest, auth, { params }) => {
  const { id } = await params;

  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_attendance (
        total_registered,
        total_checked_in,
        total_checked_out,
        last_check_in_at,
        attendance_percentage
      )
    `)
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .single();

  if (error || !session) return errorResponse('Session not found', 404);
  return successResponse({ session });
});

// PATCH /api/sessions/[id] — Update sub-event (Manager+)
export const PATCH = withPermission(async (req: NextRequest, auth, { params }) => {
  const { id } = await params;
  const body = await req.json();

  const { data: existing } = await supabase
    .from('sessions')
    .select('id, status, event_id')
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .single();

  if (!existing) return errorResponse('Session not found', 404);

  const allowedFields = [
    'title', 'description', 'session_type', 'start_time', 'end_time',
    'venue_id', 'max_capacity', 'track', 'is_required', 'status',
    'is_free', 'ticket_price', 'currency',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }
  updates.updated_at = new Date().toISOString();

  const { data: session, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 400);
  return successResponse({ session });
}, PERMISSIONS.EVENTS_EDIT);

// DELETE /api/sessions/[id] — Remove sub-event (Manager+)
export const DELETE = withPermission(async (req: NextRequest, auth, { params }) => {
  const { id } = await params;

  const { data: existing } = await supabase
    .from('sessions')
    .select('id, title, registrations_count')
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .single();

  if (!existing) return errorResponse('Session not found', 404);

  if (existing.registrations_count > 0) {
    return errorResponse('Cannot delete session with existing registrations. Cancel it instead.', 400);
  }

  const { error } = await supabase
    .from('sessions')
    .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
    .eq('id', id);

  if (error) return errorResponse(error.message, 400);
  return successResponse({ deleted: true });
}, PERMISSIONS.EVENTS_EDIT);

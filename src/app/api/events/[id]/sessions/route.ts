import { supabase } from '@/lib/supabase/client';
import { extractAuthPayload, requirePermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import type { NextRequest } from 'next/server';

// GET /api/events/[id]/sessions — List sub-events
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const auth = extractAuthPayload(req);
  if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_attendance (
        total_registered,
        total_checked_in,
        total_checked_out,
        last_check_in_at
      )
    `)
    .eq('event_id', eventId)
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .order('start_time', { ascending: true });

  if (error) return errorResponse(error.message, 400);
  return successResponse({ sessions: sessions || [] });
}

// POST /api/events/[id]/sessions — Create sub-event (Manager+)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = extractAuthPayload(req);
  if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

  const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
  if (!guard.allowed) return errorResponse(guard.error, guard.status);

  const { id: eventId } = await params;
  const body = await req.json();
  const {
    title, description, session_type, start_time, end_time,
    venue_id, max_capacity, track, is_required,
    is_free, ticket_price, currency,
  } = body;

  if (!title || !start_time || !end_time) {
    return errorResponse('title, start_time, end_time are required');
  }

  if (new Date(end_time) <= new Date(start_time)) {
    return errorResponse('end_time must be after start_time');
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, start_date, end_date')
    .eq('id', eventId)
    .eq('client_id', auth.clientId)
    .single();

  if (!event) return errorResponse('Event not found', 404);

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      event_id: eventId,
      client_id: auth.clientId,
      title,
      description: description || null,
      session_type: session_type || 'talk',
      start_time,
      end_time,
      venue_id: venue_id || null,
      max_capacity: max_capacity || null,
      track: track || null,
      is_required: is_required ?? false,
      is_free: is_free ?? true,
      ticket_price: ticket_price || 0,
      currency: currency || 'INR',
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 400);
  return successResponse({ session }, 201);
}

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/events/[id]/attendance — SSE stream of live attendance per sub-event
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = extractTokenFromHeader(req.headers.get('authorization'));
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const clientId = payload.client_id;
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'No client context' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const { id: eventId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        const { data: sessions } = await supabase
          .from('sessions')
          .select(`
            id,
            title,
            start_time,
            end_time,
            status,
            max_capacity,
            registrations_count,
            session_attendance (
              total_registered,
              total_checked_in,
              total_checked_out,
              last_check_in_at,
              attendance_percentage
            )
          `)
          .eq('event_id', eventId)
          .eq('client_id', clientId)
          .is('deleted_at', null)
          .order('start_time', { ascending: true });

        const attendance = (sessions || []).map((s: Record<string, unknown>) => {
          const sa = Array.isArray(s.session_attendance)
            ? s.session_attendance[0]
            : s.session_attendance;
          return {
            session_id: s.id,
            title: s.title,
            start_time: s.start_time,
            end_time: s.end_time,
            status: s.status,
            max_capacity: s.max_capacity,
            registrations_count: s.registrations_count,
            total_registered: (sa as Record<string, unknown>)?.total_registered || 0,
            total_checked_in: (sa as Record<string, unknown>)?.total_checked_in || 0,
            total_checked_out: (sa as Record<string, unknown>)?.total_checked_out || 0,
            last_check_in_at: (sa as Record<string, unknown>)?.last_check_in_at || null,
            attendance_percentage: (sa as Record<string, unknown>)?.attendance_percentage || 0,
          };
        });

        const payload = `data: ${JSON.stringify({ attendance, timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Send initial data
      send();

      // Poll every 5 seconds
      const interval = setInterval(send, 5000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

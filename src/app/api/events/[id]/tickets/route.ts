import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/tickets — List tickets with QR status
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('tickets')
        .select(`
          id, ticket_number, status, qr_version, qr_last_rotated_at,
          qr_rotation_count, checked_in_at, checked_out_at, created_at,
          registration:registrations (
            first_name, last_name, email
          ),
          qr_nonces:qr_nonces!ticket_id (
            expires_at, is_active
          )
        `, { count: 'exact' })
        .eq('event_id', eventId)
        .eq('client_id', user.client_id!)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: tickets, count, error } = await query;

      if (error) throw error;

      // Get active QR status for each ticket
      const enrichedTickets = (tickets || []).map((t: Record<string, unknown>) => {
        const nonces = Array.isArray(t.qr_nonces) ? t.qr_nonces : [];
        const activeNonce = nonces.find((n: Record<string, unknown>) => n.is_active && new Date(n.expires_at as string) > new Date());

        return {
          id: t.id,
          ticket_number: t.ticket_number,
          status: t.status,
          qr_version: t.qr_version,
          qr_last_rotated_at: t.qr_last_rotated_at,
          qr_rotation_count: t.qr_rotation_count,
          has_active_qr: !!activeNonce,
          qr_expires_at: activeNonce?.expires_at || null,
          checked_in_at: t.checked_in_at,
          checked_out_at: t.checked_out_at,
          created_at: t.created_at,
          registration: t.registration,
        };
      });

      return NextResponse.json({
        success: true,
        data: enrichedTickets,
        total: count || 0,
        page,
        limit,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list tickets';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { ticketService } from '@/lib/ticket-service';
import { manualCertificateService } from '@/lib/manual-certificates';
import { supabase } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/stats — Admin dashboard ticket/certificate stats
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;

      // Get ticket stats
      const ticketStats = await ticketService.getEventTicketStats(user.client_id!, eventId);

      // Get certificate stats
      const certStats = await manualCertificateService.getStats(user.client_id!, eventId);

      // Get session attendance summary
      const { data: sessionAttendance } = await supabase
        .from('session_attendance')
        .select('session_id, total_registered, total_checked_in, total_checked_out')
        .eq('event_id', eventId)
        .eq('client_id', user.client_id!);

      // Get recent registrations
      const { data: recentRegistrations } = await supabase
        .from('registrations')
        .select('id, first_name, last_name, email, status, created_at')
        .eq('event_id', eventId)
        .eq('client_id', user.client_id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      return NextResponse.json({
        success: true,
        data: {
          tickets: ticketStats,
          certificates: certStats,
          sessions: sessionAttendance || [],
          recent_registrations: recentRegistrations || [],
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get event stats';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

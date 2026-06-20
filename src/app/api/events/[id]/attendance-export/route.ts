import { NextRequest, NextResponse } from 'next/server';
import { attendanceDashboard } from '@/lib/attendance-dashboard';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/attendance-export — Export attendance as CSV
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const data = await attendanceDashboard.exportAttendance(user.client_id!, eventId);

      // Build CSV
      const headers = ['Name', 'Email', 'Phone', 'Check In', 'Check Out', 'Duration (min)', 'Attendance %', 'Eligible', 'Reason'];
      const rows = data.map((row: Record<string, unknown>) => {
        const reg = row.registration as Record<string, string> | null;
        return [
          reg ? `${reg.first_name} ${reg.last_name}` : '',
          reg?.email || '',
          reg?.phone || '',
          row.check_in_time ? new Date(row.check_in_time as string).toLocaleString() : '',
          row.check_out_time ? new Date(row.check_out_time as string).toLocaleString() : '',
          row.duration_minutes || '',
          row.attendance_percentage || '',
          row.is_eligible ? 'Yes' : 'No',
          row.eligibility_reason || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-${eventId}.csv"`,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export attendance';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

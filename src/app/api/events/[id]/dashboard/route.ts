import { NextRequest, NextResponse } from 'next/server';
import { attendanceDashboard } from '@/lib/attendance-dashboard';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/dashboard — Full attendance dashboard
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const dashboard = await attendanceDashboard.getFullDashboard(user.client_id!, eventId);
      return NextResponse.json({ success: true, data: dashboard });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get dashboard';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

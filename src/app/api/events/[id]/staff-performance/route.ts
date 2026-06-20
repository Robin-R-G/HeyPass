import { NextRequest, NextResponse } from 'next/server';
import { gateService } from '@/lib/gate-service';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/staff-performance — Get staff scan performance
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const performance = await gateService.getStaffPerformance(user.client_id!, eventId);
      return NextResponse.json({ success: true, data: performance });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get staff performance';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

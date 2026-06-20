import { NextRequest, NextResponse } from 'next/server';
import { eligibilityService } from '@/lib/eligibility';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/eligibility — Get attendance eligibility for all registrations
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const results = await eligibilityService.calculateForEvent(user.client_id!, eventId);
      return NextResponse.json({ success: true, data: results });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to calculate eligibility';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

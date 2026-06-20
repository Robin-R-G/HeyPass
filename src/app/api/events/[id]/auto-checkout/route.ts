import { NextRequest, NextResponse } from 'next/server';
import { autoCheckoutService } from '@/lib/auto-checkout';
import { withAuth } from '@/lib/route-guard';

// POST /api/events/[id]/auto-checkout — Trigger auto-checkout
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const result = await autoCheckoutService.processEvent(eventId, user.client_id!, new Date().toISOString());
      return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to process auto-checkout';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

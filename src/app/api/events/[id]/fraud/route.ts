import { NextRequest, NextResponse } from 'next/server';
import { scanValidation } from '@/lib/qr-scanner';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/fraud — Get fraud summary
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id: eventId } = await params;
      const summary = await scanValidation.getFraudSummary(clientId, eventId);
      return NextResponse.json({ success: true, data: summary });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get fraud summary';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

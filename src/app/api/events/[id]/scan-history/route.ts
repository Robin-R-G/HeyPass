import { NextRequest, NextResponse } from 'next/server';
import { scanValidation } from '@/lib/qr-scanner';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/scan-history — Get scan audit trail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '50');

      const history = await scanValidation.getScanHistory(user.client_id!, eventId, limit);
      return NextResponse.json({ success: true, data: history });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get scan history';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

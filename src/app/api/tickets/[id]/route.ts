import { NextRequest, NextResponse } from 'next/server';
import { qrGenerator } from '@/lib/qr-generator';
import { withAuth } from '@/lib/route-guard';

// GET /api/tickets/[id] — Get ticket preview with secure QR
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id } = await params;
      const qrData = await qrGenerator.generateForDisplay(clientId, id);
      if (!qrData) {
        return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: qrData });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get ticket';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

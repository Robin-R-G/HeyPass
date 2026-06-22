import { NextRequest, NextResponse } from 'next/server';
import { qrGenerator } from '@/lib/qr-generator';
import { withAuth } from '@/lib/route-guard';

// POST /api/tickets/[id]/qr — Generate fresh QR code for ticket
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id } = await params;
      const qrData = await qrGenerator.generate(clientId, id);
      if (!qrData) {
        return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: qrData });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate QR';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

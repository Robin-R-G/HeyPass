import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { commissionInvoiceService } from '@/lib/commission-invoice-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id') || undefined;
      const status = searchParams.get('status') || undefined;
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = await commissionInvoiceService.listCommissions(clientId, {
        event_id: eventId,
        status,
        date_from: dateFrom,
        date_to: dateTo,
        limit,
        offset,
      });

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { commissionInvoiceService } from '@/lib/commission-invoice-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;

      const summary = await commissionInvoiceService.getCommissionSummary(clientId, dateFrom, dateTo);
      return NextResponse.json({ summary });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

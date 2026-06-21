import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { commissionInvoiceService } from '@/lib/commission-invoice-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get('type') || undefined;
      const status = searchParams.get('status') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = await commissionInvoiceService.listInvoices(clientId, {
        type,
        status,
        limit,
        offset,
      });

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

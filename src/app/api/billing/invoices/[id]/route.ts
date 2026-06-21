import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { commissionInvoiceService } from '@/lib/commission-invoice-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const invoice = await commissionInvoiceService.getInvoice(clientId, id);
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      return NextResponse.json({ invoice });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

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

      // Verify invoice belongs to client
      const invoice = await commissionInvoiceService.getInvoice(clientId, id);
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const pdfBuffer = await commissionInvoiceService.generateInvoicePDF(id);

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

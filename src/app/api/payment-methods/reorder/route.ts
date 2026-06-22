import { NextRequest, NextResponse } from 'next/server';
import { paymentMethodService } from '@/lib/payment-methods';
import { withAuth } from '@/lib/route-guard';

export async function PUT(req: NextRequest) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { orderedIds } = await req.json();
      if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ success: false, error: 'orderedIds must be an array' }, { status: 400 });
      }
      await paymentMethodService.reorder(clientId, orderedIds);
      return NextResponse.json({ success: true, message: 'Payment methods reordered' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reorder payment methods';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

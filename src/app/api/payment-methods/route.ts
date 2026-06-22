import { NextRequest, NextResponse } from 'next/server';
import { paymentMethodService } from '@/lib/payment-methods';
import { withAuth } from '@/lib/route-guard';

export async function GET(req: NextRequest) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const methods = await paymentMethodService.list(clientId);
      return NextResponse.json({ success: true, data: methods });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list payment methods';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const body = await req.json();
      const method = await paymentMethodService.create(clientId, body);
      return NextResponse.json({ success: true, data: method }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create payment method';
      const status = message.includes('Maximum') || message.includes('Invalid') ? 400 : 500;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  });
}

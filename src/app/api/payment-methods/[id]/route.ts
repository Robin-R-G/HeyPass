import { NextRequest, NextResponse } from 'next/server';
import { paymentMethodService } from '@/lib/payment-methods';
import { withAuth } from '@/lib/route-guard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id } = await params;
      const method = await paymentMethodService.get(clientId, id);
      if (!method) {
        return NextResponse.json({ success: false, error: 'Payment method not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: method });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get payment method';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const method = await paymentMethodService.update(clientId, id, body);
      return NextResponse.json({ success: true, data: method });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update payment method';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id } = await params;
      await paymentMethodService.delete(clientId, id);
      return NextResponse.json({ success: true, message: 'Payment method deleted' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete payment method';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

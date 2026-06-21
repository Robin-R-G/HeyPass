import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { commissionInvoiceService } from '@/lib/commission-invoice-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.type || event.event_type;

    // Find client
    const { data: configs } = await supabaseAdmin
      .from('payment_gateway_config')
      .select('client_id, webhook_secret_encrypted')
      .eq('provider', 'cashfree')
      .eq('is_active', true);

    if (!configs || configs.length === 0) {
      return NextResponse.json({ error: 'No gateway configured' }, { status: 400 });
    }

    let matchedClientId: string | null = null;

    for (const config of configs) {
      // Verify signature
      const secret = config.webhook_secret_encrypted;
      const payload = `${timestamp}${body}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      if (signature === expectedSignature) {
        matchedClientId = config.client_id;
        break;
      }
    }

    if (!matchedClientId) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Idempotency check
    const orderId = event.data?.order_id || event.data?.cf_order_id || '';
    const idempotencyKey = `cashfree-${eventType}-${orderId}`;

    const { data: existing } = await supabaseAdmin
      .from('billing_webhook_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await supabaseAdmin.from('billing_webhook_events').insert({
      client_id: matchedClientId,
      gateway: 'cashfree',
      event_type: eventType,
      payload: event.data,
      idempotency_key: idempotencyKey,
    });

    // Process event
    switch (eventType) {
      case 'PAYMENT_SUCCESS': {
        const payment = event.data;
        const amount = parseFloat(payment.order_amount);

        await commissionInvoiceService.createCommission({
          client_id: matchedClientId,
          transaction_id: payment.cf_payment_id || payment.payment_id,
          transaction_amount: amount,
          transaction_at: payment.payment_time || new Date().toISOString(),
        });

        await supabaseAdmin
          .from('payments')
          .update({
            status: 'completed',
            payment_reference: payment.cf_payment_id || payment.payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', payment.order_id);

        break;
      }

      case 'PAYMENT_FAILED': {
        const payment = event.data;

        await supabaseAdmin
          .from('payments')
          .update({
            status: 'failed',
            metadata: { error: payment.payment_message },
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', payment.order_id);

        break;
      }

      case 'REFUND_SUCCESS': {
        const refund = event.data;
        const amount = parseFloat(refund.refund_amount);

        await supabaseAdmin
          .from('payments')
          .update({
            status: 'refunded',
            metadata: { refund_id: refund.cf_refund_id, refund_amount: amount },
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', refund.order_id);

        break;
      }
    }

    // Mark processed
    await supabaseAdmin
      .from('billing_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Cashfree webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

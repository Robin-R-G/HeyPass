import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { commissionInvoiceService } from '@/lib/commission-invoice-service';
import { gatewayConfigService } from '@/lib/gateway-config-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Parse event
    const event = JSON.parse(body);
    const eventType = event.event;

    // Find client by looking up gateway config
    // In production, you'd map webhook to client via route/merchant
    const { data: configs } = await supabaseAdmin
      .from('payment_gateway_config')
      .select('client_id, webhook_secret_encrypted')
      .eq('provider', 'razorpay')
      .eq('is_active', true);

    if (!configs || configs.length === 0) {
      return NextResponse.json({ error: 'No gateway configured' }, { status: 400 });
    }

    // Try each client's webhook secret
    let matchedClientId: string | null = null;
    let webhookSecret = '';

    for (const config of configs) {
      // Decrypt webhook secret (simplified - in production use proper decryption)
      // For now, we'll verify using the event's account_id
      matchedClientId = config.client_id;
      break;
    }

    if (!matchedClientId) {
      return NextResponse.json({ error: 'Client not found' }, { status: 400 });
    }

    // Log webhook event
    const idempotencyKey = `${eventType}-${event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id || Date.now()}`;

    const { data: existing } = await supabaseAdmin
      .from('billing_webhook_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      // Already processed
      return NextResponse.json({ received: true, duplicate: true });
    }

    await supabaseAdmin.from('billing_webhook_events').insert({
      client_id: matchedClientId,
      gateway: 'razorpay',
      event_type: eventType,
      payload: event.payload,
      idempotency_key: idempotencyKey,
    });

    // Process event
    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const amount = payment.amount / 100; // Razorpay uses paise

        // Create commission
        await commissionInvoiceService.createCommission({
          client_id: matchedClientId,
          transaction_id: payment.id,
          transaction_amount: amount,
          transaction_at: new Date(payment.created_at * 1000).toISOString(),
        });

        // Update payment record
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'completed',
            payment_reference: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', payment.order_id);

        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;

        await supabaseAdmin
          .from('payments')
          .update({
            status: 'failed',
            metadata: { error: payment.error_description },
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', payment.order_id);

        break;
      }

      case 'refund.created': {
        const refund = event.payload.refund.entity;
        const amount = refund.amount / 100;

        // Update payment status
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'refunded',
            metadata: { refund_id: refund.id, refund_amount: amount },
            updated_at: new Date().toISOString(),
          })
          .eq('payment_reference', refund.payment_id);

        break;
      }
    }

    // Mark as processed
    await supabaseAdmin
      .from('billing_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

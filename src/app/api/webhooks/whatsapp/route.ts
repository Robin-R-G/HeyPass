import { NextRequest } from 'next/server';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';

// GET = webhook verification (Meta challenge)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Fail-closed: no secret configured = reject everything
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return new Response('Service unavailable', { status: 503 });
  }

  // In production, you'd look up the client by their verify token
  // For now, accept if token matches env
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('Forbidden', { status: 403 });
}

// POST = webhook events
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Fail-closed: no secret configured = reject everything
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      return new Response('Service unavailable', { status: 503 });
    }

    // Verify signature
    if (signature) {
      const crypto = require('crypto');
      const expected = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(body)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return new Response('Invalid signature', { status: 403 });
      }
    }

    // Parse and find client_id from payload
    const data = JSON.parse(body);
    const phoneNumberId = data.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (phoneNumberId) {
      // Find client by phone_number_id
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: config } = await supabase
        .from('whatsapp_configs')
        .select('client_id')
        .eq('phone_number_id', phoneNumberId)
        .is('deleted_at', null)
        .single();

      if (config?.client_id) {
        const service = getWhatsAppService();
        await service.processWebhook(body, signature, config.client_id);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return new Response('OK', { status: 200 }); // Always 200 for webhooks
  }
}

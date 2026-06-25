import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    const { data: creds } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('client_id')
      .eq('webhook_verify_token', token)
      .single();

    if (creds) {
      return new Response(challenge, { status: 200 });
    }
  }

  return new Response('Verification failed', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const wabaId = entry?.id;

    if (!value) return new Response('OK', { status: 200 });

    let clientId: string | null = null;

    if (wabaId) {
      const { data: creds } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('client_id')
        .eq('waba_id', wabaId)
        .single();
      clientId = creds?.client_id || null;
    }

    if (!clientId) {
      const { data: first } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('client_id')
        .limit(1)
        .single();
      clientId = first?.client_id || null;
    }

    if (!clientId) return new Response('OK', { status: 200 });

    const now = new Date().toISOString();
    const { whatsappService } = await import('@/lib/whatsapp-service');

    if (value.statuses?.[0]) {
      const statusObj = value.statuses[0];
      const messageId = statusObj.id;
      const status = statusObj.status;
      const timestamp = new Date(parseInt(statusObj.timestamp) * 1000).toISOString();
      const failedReason = statusObj.errors?.[0]?.message || null;

      const updateData: any = { status };
      if (status === 'delivered') updateData.delivered_at = timestamp;
      if (status === 'read') updateData.read_at = timestamp;
      if (status === 'failed') updateData.failed_reason = failedReason;

      await supabaseAdmin.from('whatsapp_messages').update(updateData).eq('message_id', messageId);

      const { data: msg } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('campaign_id')
        .eq('message_id', messageId)
        .single();

      if (msg?.campaign_id) {
        await whatsappService.aggregateCampaignStats(clientId, msg.campaign_id);
      }
    }

    if (value.messages?.[0]) {
      const msgObj = value.messages[0];
      const phone = `+${msgObj.from}`;
      const text = msgObj.text?.body || 'Media Message';
      const timestamp = new Date(parseInt(msgObj.timestamp) * 1000).toISOString();
      const messageId = msgObj.id;

      let { data: contact } = await supabaseAdmin
        .from('crm_contacts')
        .select('id')
        .eq('tenant_id', clientId)
        .eq('phone', phone)
        .single();

      if (!contact) {
        const { data: newContact } = await supabaseAdmin
          .from('crm_contacts')
          .insert({
            tenant_id: clientId,
            name: value.contacts?.[0]?.profile?.name || 'WhatsApp Contact',
            phone,
            source: 'whatsapp_inbound',
            status: 'active',
          })
          .select('id')
          .single();
        contact = newContact;
      }

      if (contact) {
        await supabaseAdmin.from('whatsapp_messages').insert({
          message_id: messageId,
          client_id: clientId,
          contact_id: contact.id,
          message_text: text,
          status: 'read',
          direction: 'inbound',
          sent_at: timestamp,
          read_at: timestamp,
        });
      }
    }

    return new Response('OK', { status: 200 });
  } catch {
    return new Response('OK', { status: 200 });
  }
}

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = getSupabase();
  const now = new Date().toISOString();

  const { data: dueBroadcasts, error: fetchError } = await db
    .from('whatsapp_broadcasts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .is('deleted_at', null)
    .limit(10);

  if (fetchError) {
    console.error('[Broadcast Cron] Fetch error:', fetchError);
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueBroadcasts || dueBroadcasts.length === 0) {
    return Response.json({ processed: 0, message: 'No due broadcasts' });
  }

  const results: { broadcast_id: string; status: string; error?: string }[] = [];

  for (const broadcast of dueBroadcasts) {
    try {
      await db
        .from('whatsapp_broadcasts')
        .update({ status: 'sending', started_at: now })
        .eq('id', broadcast.id);

      const { data: contacts, error: contactError } = await db
        .from('whatsapp_contacts')
        .select('id, phone, name')
        .eq('client_id', broadcast.client_id)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (contactError || !contacts || contacts.length === 0) {
        await db
          .from('whatsapp_broadcasts')
          .update({ status: 'failed', completed_at: now })
          .eq('id', broadcast.id);
        results.push({ broadcast_id: broadcast.id, status: 'failed', error: 'No contacts found' });
        continue;
      }

      await db
        .from('whatsapp_broadcasts')
        .update({ total_contacts: contacts.length })
        .eq('id', broadcast.id);

      for (const contact of contacts) {
        await db.from('whatsapp_broadcast_deliveries').insert({
          broadcast_id: broadcast.id,
          contact_id: contact.id,
          client_id: broadcast.client_id,
          status: 'queued',
        });
      }

      const { data: config } = await db
        .from('whatsapp_configs')
        .select('*')
        .eq('client_id', broadcast.client_id)
        .is('deleted_at', null)
        .single();

      if (!config) {
        await db
          .from('whatsapp_broadcasts')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', broadcast.id);
        results.push({ broadcast_id: broadcast.id, status: 'failed', error: 'No WhatsApp config' });
        continue;
      }

      const { getWhatsAppService } = await import('@/lib/whatsapp/whatsapp-service');
      const service = getWhatsAppService();
      const sendResult = await service.sendBroadcast(broadcast.client_id, broadcast.id);

      if (!sendResult.success) {
        await db
          .from('whatsapp_broadcasts')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', broadcast.id);
        results.push({ broadcast_id: broadcast.id, status: 'failed', error: sendResult.error });
      } else {
        results.push({ broadcast_id: broadcast.id, status: 'sent' });
      }
    } catch (err) {
      console.error(`[Broadcast Cron] Error processing ${broadcast.id}:`, err);
      await db
        .from('whatsapp_broadcasts')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', broadcast.id);
      results.push({ broadcast_id: broadcast.id, status: 'failed', error: String(err) });
    }
  }

  return Response.json({ processed: results.length, results });
}

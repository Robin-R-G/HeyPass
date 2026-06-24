import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { whatsappService } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const searchParams = req.nextUrl.searchParams;
    const contactId = searchParams.get('contactId');

    if (contactId) {
      // Fetch history with a specific contact
      const history = await whatsappService.getConversationHistory(auth.clientId, contactId);
      return successResponse({ history });
    }

    // Fetch conversation list
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const tag = searchParams.get('tag') || undefined;
    
    const conversations = await whatsappService.getConversations(auth.clientId, {
      eventId,
      search,
      status,
      tag,
    });

    return successResponse({ conversations });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { contactId, text, simulate_direction, messageId, status, failed_reason } = body;

    if (!contactId) return errorResponse('contactId is required');

    // 1. Simulate inbound message webhook
    if (simulate_direction === 'inbound') {
      const { data: contact } = await supabaseAdmin
        .from('crm_contacts')
        .select('phone')
        .eq('id', contactId)
        .single();
      
      const phone = contact?.phone || '+919999999999';
      const inboundId = `wamid.HBgL${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
      const now = new Date().toISOString();

      await supabaseAdmin.from('whatsapp_messages').insert({
        message_id: inboundId,
        client_id: auth.clientId,
        contact_id: contactId,
        message_text: text || 'Simulated user response',
        status: 'read',
        direction: 'inbound',
        sent_at: now,
        delivered_at: now,
        read_at: now,
      });

      return successResponse({ success: true, messageId: inboundId });
    }

    // 2. Simulate message delivery receipt callback
    if (simulate_direction === 'status') {
      if (!messageId) return errorResponse('messageId is required for status updates');
      const now = new Date().toISOString();
      const updateData: any = { status };
      if (status === 'delivered') updateData.delivered_at = now;
      if (status === 'read') {
        updateData.delivered_at = now;
        updateData.read_at = now;
      }
      if (status === 'failed') updateData.failed_reason = failed_reason || 'Mock delivery failure';

      await supabaseAdmin
        .from('whatsapp_messages')
        .update(updateData)
        .eq('message_id', messageId);

      // Aggregate counts if campaign links
      const { data: msg } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('campaign_id')
        .eq('message_id', messageId)
        .single();

      if (msg?.campaign_id) {
        await whatsappService.aggregateCampaignStats(auth.clientId, msg.campaign_id);
      }

      return successResponse({ success: true });
    }

    // 3. Normal Outbound message send
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    if (!text) return errorResponse('text is required for outbound replies');

    const sent = await whatsappService.sendTextMessage({
      clientId: auth.clientId,
      contactId,
      eventId,
      text,
    });

    return successResponse({ message: sent });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

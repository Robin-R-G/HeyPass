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

    // Fetch campaigns
    const { data: campaigns, error: campaignError } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .select(`
        *,
        template:whatsapp_templates(name, category, body_text)
      `)
      .eq('client_id', auth.clientId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (campaignError) throw campaignError;

    // Fetch templates
    const { data: templates, error: templateError } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('client_id', auth.clientId);

    if (templateError) throw templateError;

    return successResponse({ campaigns: campaigns || [], templates: templates || [] });
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
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name, templateId, targetSegment, variables = [] } = body;

    if (!name || !templateId || !targetSegment) {
      return errorResponse('name, templateId, and targetSegment are required');
    }

    // 1. Fetch Template
    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('name, body_text')
      .eq('client_id', auth.clientId)
      .eq('id', templateId)
      .single();

    if (!template) return errorResponse('Template not found');

    // 2. Create Campaign in DB
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .insert({
        client_id: auth.clientId,
        event_id: eventId,
        name,
        template_id: templateId,
        target_segment: targetSegment,
        status: 'sending',
      })
      .select('*')
      .single();

    if (campaignError || !campaign) throw campaignError;

    // 3. Resolve Target Contacts
    let contactIds: string[] = [];

    if (targetSegment === 'all') {
      const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('contact_id')
        .eq('event_id', eventId);
      contactIds = (regs || []).map(r => r.contact_id).filter(Boolean);
    } else if (targetSegment === 'checked_in') {
      const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('contact_id')
        .eq('event_id', eventId)
        .not('checked_in_at', 'is', null);
      contactIds = (regs || []).map(r => r.contact_id).filter(Boolean);
    } else if (targetSegment === 'absent') {
      const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('contact_id')
        .eq('event_id', eventId)
        .is('checked_in_at', null);
      contactIds = (regs || []).map(r => r.contact_id).filter(Boolean);
    } else if (targetSegment === 'volunteers') {
      const { data: vols } = await supabaseAdmin
        .from('volunteer_applications')
        .select('contact_id')
        .eq('event_id', eventId)
        .eq('status', 'approved');
      contactIds = (vols || []).map(v => v.contact_id).filter(Boolean);
    } else if (targetSegment === 'speakers') {
      const { data: speakers } = await supabaseAdmin
        .from('session_speakers')
        .select('contact_id')
        .eq('session_id', eventId); // speakers are on sessions, event speaker resolves to all speakers of this event's sessions
      // Wait, let's fetch session speakers of this event
      const { data: eventSpeakers } = await supabaseAdmin
        .from('session_speakers')
        .select('contact_id')
        .in('session_id', (
          await supabaseAdmin.from('sessions').select('id').eq('event_id', eventId)
        ).data?.map(s => s.id) || []);
      contactIds = (eventSpeakers || []).map(s => s.contact_id).filter(Boolean);
    } else if (targetSegment === 'sponsors') {
      const { data: sponsors } = await supabaseAdmin
        .from('sponsors')
        .select('contact_id')
        .eq('event_id', eventId);
      contactIds = (sponsors || []).map(s => s.contact_id).filter(Boolean);
    }

    // Deduplicate target contacts
    contactIds = Array.from(new Set(contactIds));

    // 4. Dispatch WhatsApp messages in background / loop
    let sentCount = 0;
    let failedCount = 0;

    for (const cId of contactIds) {
      try {
        // Resolve dynamic variables. Let's lookup attendee name if we need standard template replacements
        const { data: contact } = await supabaseAdmin
          .from('crm_contacts')
          .select('name')
          .eq('id', cId)
          .single();

        // Resolve variables: replace standard templates e.g. {{name}}
        const resolvedVars = variables.map((v: string) => {
          if (v === '{{name}}') return contact?.name || 'Attendee';
          if (v === '{{event_title}}') return 'Event'; // we can customize this
          return v;
        });

        await whatsappService.sendTemplateMessage({
          clientId: auth.clientId,
          contactId: cId,
          eventId,
          campaignId: campaign.id,
          templateName: template.name,
          variables: resolvedVars,
        });
        sentCount++;
      } catch (err) {
        failedCount++;
      }
    }

    // Update campaign metrics
    await whatsappService.aggregateCampaignStats(auth.clientId, campaign.id);

    return successResponse({ campaign, targets: contactIds.length, sentCount, failedCount });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

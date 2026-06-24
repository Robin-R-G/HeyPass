import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const { id: eventId, contactId } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    // 1. Fetch main contact profile
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('crm_contacts')
      .select('*')
      .eq('tenant_id', auth.clientId)
      .eq('id', contactId)
      .is('deleted_at', null)
      .single();

    if (contactError || !contact) return errorResponse('Contact not found', 404);

    // 2. Fetch registrations (event history)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select(`
        id, event_id, status, created_at, checked_in_at, checked_out_at,
        event:events(title, start_date)
      `)
      .eq('contact_id', contactId);

    const regIds = (registrations || []).map(r => r.id);

    // 3. Fetch certificates
    let certificates = [];
    if (regIds.length > 0) {
      const { data: certs } = await supabaseAdmin
        .from('certificates')
        .select(`
          id, certificate_number, pdf_url, status, issued_at,
          template:certificate_templates(name)
        `)
        .in('registration_id', regIds);
      certificates = certs || [];
    }

    // 4. Fetch payments
    let payments = [];
    if (regIds.length > 0) {
      const { data: pays } = await supabaseAdmin
        .from('payments')
        .select('*')
        .in('registration_id', regIds);
      payments = pays || [];
    }

    // 5. Fetch feedback
    let feedbacks = [];
    if (regIds.length > 0) {
      const { data: fbs } = await supabaseAdmin
        .from('event_feedback')
        .select(`
          id, rating, comments, created_at,
          event:events(title)
        `)
        .in('registration_id', regIds);
      feedbacks = fbs || [];
    }

    // 6. Fetch volunteer shifts/applications
    const { data: volunteerApps } = await supabaseAdmin
      .from('volunteer_applications')
      .select(`
        id, event_id, status, created_at,
        event:events(title),
        assignments:volunteer_assignments(
          id, status, checked_in_at, checked_out_at,
          task:volunteer_tasks(title, location, start_time, end_time)
        )
      `)
      .eq('contact_id', contactId);

    // 7. Fetch speaker sessions
    const { data: speakerSessions } = await supabaseAdmin
      .from('session_speakers')
      .select(`
        id, session_id, is_moderator,
        session:sessions(
          title, start_time, end_time, session_type,
          event:events(title)
        )
      `)
      .eq('contact_id', contactId);

    // 8. Fetch sponsor associations
    const { data: sponsors } = await supabaseAdmin
      .from('sponsors')
      .select(`
        id, name, tier, booth_location, amount_paid, is_active,
        event:events(title)
      `)
      .eq('contact_id', contactId);

    // 9. Fetch WhatsApp conversation logs
    const { data: waMessages } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('client_id', auth.clientId)
      .eq('contact_id', contactId)
      .order('sent_at', { ascending: false })
      .limit(50);

    // 10. Calculate dynamic attendance rate
    let attendanceRate = 0;
    if (registrations && registrations.length > 0) {
      const checkedInCount = registrations.filter(r => r.checked_in_at !== null || r.status === 'checked_in' || r.status === 'checked_out').length;
      attendanceRate = Math.round((checkedInCount / registrations.length) * 100);
    }

    return successResponse({
      profile: contact,
      attendanceRate,
      eventHistory: registrations || [],
      certificates,
      payments,
      feedbacks,
      volunteerHistory: volunteerApps || [],
      speakerHistory: speakerSessions || [],
      sponsorInteractions: sponsors || [],
      whatsappLogs: waMessages || [],
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const { id: eventId, contactId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name, email, phone, organization, designation, tags, notes, status, interests } = body;

    const { data: contact, error } = await supabaseAdmin
      .from('crm_contacts')
      .update({
        name,
        email,
        phone,
        organization,
        designation,
        tags,
        notes,
        status,
        interests,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', auth.clientId)
      .eq('id', contactId)
      .select('*')
      .single();

    if (error) throw error;
    return successResponse({ contact });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const { id: eventId, contactId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_DELETE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const { error } = await supabaseAdmin
      .from('crm_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tenant_id', auth.clientId)
      .eq('id', contactId);

    if (error) throw error;
    return successResponse({ success: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

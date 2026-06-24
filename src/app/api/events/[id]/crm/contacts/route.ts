import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tag = searchParams.get('tag') || '';
    const contactType = searchParams.get('type') || '';
    const scope = searchParams.get('scope') || 'event'; // 'event' or 'all'

    let query = supabaseAdmin
      .from('crm_contacts')
      .select('*')
      .eq('tenant_id', auth.clientId)
      .is('deleted_at', null)
      .order('engagement_score', { ascending: false });

    // Scope filtering
    if (scope === 'event') {
      // 1. Get contacts from registrations of this event
      const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('contact_id')
        .eq('event_id', eventId);
      
      // 2. Get contacts from volunteers of this event
      const { data: vols } = await supabaseAdmin
        .from('volunteer_applications')
        .select('contact_id')
        .eq('event_id', eventId);

      const regIds = (regs || []).map(r => r.contact_id);
      const volIds = (vols || []).map(v => v.contact_id);
      const combinedIds = Array.from(new Set([...regIds, ...volIds])).filter(Boolean);

      query = query.in('id', combinedIds);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: contacts, error } = await query;
    if (error) throw error;

    // Filter by type programmatically if type filter is active
    let filteredContacts = contacts || [];
    if (contactType) {
      // Check which contacts match specific type
      if (contactType === 'Attendee') {
        const { data: attendeeRegs } = await supabaseAdmin.from('registrations').select('contact_id').eq('client_id', auth.clientId);
        const attendeeIds = new Set(attendeeRegs?.map(r => r.contact_id).filter(Boolean));
        filteredContacts = filteredContacts.filter(c => attendeeIds.has(c.id));
      } else if (contactType === 'Volunteer') {
        const { data: volApps } = await supabaseAdmin.from('volunteer_applications').select('contact_id').eq('client_id', auth.clientId);
        const volIds = new Set(volApps?.map(r => r.contact_id).filter(Boolean));
        filteredContacts = filteredContacts.filter(c => volIds.has(c.id));
      } else if (contactType === 'Speaker') {
        const { data: speakers } = await supabaseAdmin.from('session_speakers').select('contact_id');
        const speakerIds = new Set(speakers?.map(r => r.contact_id).filter(Boolean));
        filteredContacts = filteredContacts.filter(c => speakerIds.has(c.id));
      } else if (contactType === 'Sponsor') {
        const { data: sponsors } = await supabaseAdmin.from('sponsors').select('contact_id').eq('client_id', auth.clientId);
        const sponsorIds = new Set(sponsors?.map(r => r.contact_id).filter(Boolean));
        filteredContacts = filteredContacts.filter(c => sponsorIds.has(c.id));
      }
    }

    // Filter by tag programmatically
    if (tag) {
      filteredContacts = filteredContacts.filter(c => c.tags?.includes(tag));
    }

    return successResponse({ contacts: filteredContacts });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name, email, phone, organization, designation, tags, notes, source } = body;
    if (!name) return errorResponse('name is required');

    const { data: contact, error } = await supabaseAdmin
      .from('crm_contacts')
      .insert({
        tenant_id: auth.clientId,
        name,
        email: email || null,
        phone: phone || null,
        organization: organization || null,
        designation: designation || null,
        tags: tags || [],
        notes: notes || null,
        source: source || 'manual_entry',
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;
    return successResponse({ contact }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { generateSlug } from '@/lib/utils';

interface CloneOptions {
  includeSessions?: boolean;
  includeForms?: boolean;
  includeTickets?: boolean;
  includeGates?: boolean;
  includeCertificates?: boolean;
  includeNotifications?: boolean;
  includeCoupons?: boolean;
  includeBranding?: boolean;
}

interface CloneResult {
  event: Record<string, unknown>;
  sessions: number;
  speakers: number;
  venues: number;
  tags: number;
  coHosts: number;
  forms: number;
  formSections: number;
  formFields: number;
  ticketTypes: number;
  attendanceRules: number;
  gates: number;
  gateSessions: number;
  notificationTemplates: number;
  registrationLinks: number;
  coupons: number;
  branding: boolean;
}

const DEFAULT_OPTIONS: CloneOptions = {
  includeSessions: true,
  includeForms: true,
  includeTickets: true,
  includeGates: true,
  includeCertificates: true,
  includeNotifications: true,
  includeCoupons: true,
  includeBranding: true,
};

async function cloneEvent(
  sourceEventId: string,
  clientId: string,
  userId: string,
  options: CloneOptions = {}
): Promise<CloneResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const { data: sourceEvent, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', sourceEventId)
    .eq('client_id', clientId)
    .single();

  if (fetchError || !sourceEvent) {
    throw new Error('Source event not found');
  }

  const newSlug = await generateUniqueSlug(clientId, sourceEvent.slug);
  const newTitle = `${sourceEvent.title} (Copy)`;

  const { data: newEvent, error: insertError } = await supabaseAdmin
    .from('events')
    .insert({
      client_id: clientId,
      category_id: sourceEvent.category_id,
      title: newTitle,
      slug: newSlug,
      subtitle: sourceEvent.subtitle,
      description: sourceEvent.description,
      event_type: sourceEvent.event_type,
      status: 'draft',
      start_date: sourceEvent.start_date,
      end_date: sourceEvent.end_date,
      timezone: sourceEvent.timezone,
      max_capacity: sourceEvent.max_capacity,
      is_virtual: sourceEvent.is_virtual,
      virtual_link: sourceEvent.virtual_link,
      is_public: sourceEvent.is_public,
      banner_url: sourceEvent.banner_url,
      thumbnail_url: sourceEvent.thumbnail_url,
      created_by: userId,
      certificate_status: 'pending',
      is_free: sourceEvent.is_free,
      ticket_price: sourceEvent.ticket_price,
      currency: sourceEvent.currency,
      payment_method_ids: sourceEvent.payment_method_ids || [],
    })
    .select()
    .single();

  if (insertError || !newEvent) {
    throw new Error(`Failed to create cloned event: ${insertError?.message}`);
  }

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.clone',
    resource_type: 'event',
    resource_id: newEvent.id,
    new_value: {
      source_event_id: sourceEventId,
      source_title: sourceEvent.title,
      new_title: newTitle,
    },
  });

  const result: CloneResult = {
    event: newEvent,
    sessions: 0, speakers: 0, venues: 0, tags: 0, coHosts: 0,
    forms: 0, formSections: 0, formFields: 0,
    ticketTypes: 0, attendanceRules: 0,
    gates: 0, gateSessions: 0,
    notificationTemplates: 0,
    registrationLinks: 0, coupons: 0,
    branding: false,
  };

  if (opts.includeBranding) {
    result.branding = await cloneEventBranding(sourceEventId, newEvent.id, clientId);
  }

  let sessionIdMap: Map<string, string> | undefined;

  if (opts.includeSessions) {
    const sessionsResult = await cloneSessions(sourceEventId, newEvent.id, clientId);
    result.sessions = sessionsResult.sessions;
    result.speakers = sessionsResult.speakers;
    result.venues = sessionsResult.venues;
    sessionIdMap = sessionsResult.sessionIdMap;
    result.tags = await cloneEventTags(sourceEventId, newEvent.id);
    result.coHosts = await cloneEventCoHosts(sourceEventId, newEvent.id, clientId);
  }

  if (opts.includeForms) {
    const formsResult = await cloneRegistrationForms(sourceEventId, newEvent.id, clientId);
    result.forms = formsResult.forms;
    result.formSections = formsResult.formSections;
    result.formFields = formsResult.formFields;
  }

  if (opts.includeTickets) {
    result.ticketTypes = await cloneTicketTypes(sourceEventId, newEvent.id, clientId);
  }

  result.attendanceRules = await cloneAttendanceRules(sourceEventId, newEvent.id, clientId);

  if (opts.includeGates) {
    const gatesResult = await cloneGates(sourceEventId, newEvent.id, clientId, sessionIdMap);
    result.gates = gatesResult.gates;
    result.gateSessions = gatesResult.gateSessions;
  }

  // certificate_templates are client-scoped, not event-scoped; skip cloning

  if (opts.includeNotifications) {
    result.notificationTemplates = await cloneNotificationTemplates(sourceEventId, newEvent.id, clientId);
  }

  result.registrationLinks = await cloneRegistrationLinks(sourceEventId, newEvent.id, clientId);

  if (opts.includeCoupons) {
    result.coupons = await cloneCoupons(sourceEventId, newEvent.id, clientId);
  }

  return result;
}

async function generateUniqueSlug(clientId: string, baseSlug: string): Promise<string> {
  let slug = generateSlug(baseSlug + '-copy');
  let attempt = 0;
  while (attempt < 20) {
    const { data: existing } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('client_id', clientId)
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) return slug;
    attempt++;
    slug = generateSlug(`${baseSlug}-copy-${attempt}`);
  }
  return `${slug}-${Date.now()}`;
}

async function cloneEventBranding(sourceEventId: string, newEventId: string, clientId: string): Promise<boolean> {
  const { data: branding } = await supabaseAdmin
    .from('event_branding')
    .select('*')
    .eq('event_id', sourceEventId)
    .maybeSingle();

  if (!branding) return false;

  const { error } = await supabaseAdmin
    .from('event_branding')
    .insert({
      event_id: newEventId,
      client_id: clientId,
      banner_url: branding.banner_url,
      primary_color: branding.primary_color,
      custom_css: branding.custom_css,
    });

  return !error;
}

async function cloneSessions(
  sourceEventId: string,
  newEventId: string,
  clientId: string
): Promise<{ sessions: number; speakers: number; venues: number; sessionIdMap: Map<string, string> }> {
  const { data: sessions } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('event_id', sourceEventId)
    .is('deleted_at', null);

  if (!sessions || sessions.length === 0) return { sessions: 0, speakers: 0, venues: 0, sessionIdMap: new Map() };

  const sessionIdMap = new Map<string, string>();
  const newSessions = sessions.map((s) => {
    const newId = crypto.randomUUID();
    sessionIdMap.set(s.id, newId);
    return {
      id: newId,
      event_id: newEventId,
      client_id: clientId,
      title: s.title,
      description: s.description,
      session_type: s.session_type,
      start_time: s.start_time,
      end_time: s.end_time,
      venue_id: s.venue_id,
      max_capacity: s.max_capacity,
      track: s.track,
      is_required: s.is_required,
      status: 'scheduled',
      is_free: s.is_free,
      ticket_price: s.ticket_price,
      currency: s.currency,
      registrations_count: 0,
    };
  });

  const { error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert(newSessions);

  if (sessionError) throw new Error(`Failed to clone sessions: ${sessionError.message}`);

  const { data: sessionVenues } = await supabaseAdmin
    .from('event_venues')
    .select('*')
    .eq('event_id', sourceEventId);

  let venuesCloned = 0;
  if (sessionVenues && sessionVenues.length > 0) {
    const { error: veError } = await supabaseAdmin
      .from('event_venues')
      .insert(
        sessionVenues.map((ev) => ({
          event_id: newEventId,
          venue_id: ev.venue_id,
          is_primary: ev.is_primary,
        }))
      );
    if (!veError) venuesCloned = sessionVenues.length;
  }

  const { data: speakers } = await supabaseAdmin
    .from('session_speakers')
    .select('*')
    .in('session_id', Array.from(sessionIdMap.keys()));

  let speakersCloned = 0;
  if (speakers && speakers.length > 0) {
    const newSpeakers = speakers.map((sp) => ({
      session_id: sessionIdMap.get(sp.session_id) || newEventId,
      user_id: sp.user_id,
      name: sp.name,
      email: sp.email,
      bio: sp.bio,
      photo_url: sp.photo_url,
      organization: sp.organization,
      is_moderator: sp.is_moderator,
      sort_order: sp.sort_order,
    }));

    const { error: spError } = await supabaseAdmin
      .from('session_speakers')
      .insert(newSpeakers);
    if (!spError) speakersCloned = speakers.length;
  }

  return { sessions: sessions.length, speakers: speakersCloned, venues: venuesCloned, sessionIdMap };
}

async function cloneEventTags(sourceEventId: string, newEventId: string): Promise<number> {
  const { data: tags } = await supabaseAdmin
    .from('event_tags')
    .select('tag')
    .eq('event_id', sourceEventId);

  if (!tags || tags.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('event_tags')
    .insert(
      tags.map((t) => ({ event_id: newEventId, tag: t.tag }))
    );

  return error ? 0 : tags.length;
}

async function cloneEventCoHosts(sourceEventId: string, newEventId: string, clientId: string): Promise<number> {
  const { data: coHosts } = await supabaseAdmin
    .from('event_co_hosts')
    .select('*')
    .eq('event_id', sourceEventId);

  if (!coHosts || coHosts.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('event_co_hosts')
    .insert(
      coHosts.map((ch) => ({
        event_id: newEventId,
        client_id: clientId,
        name: ch.name,
        logo_url: ch.logo_url,
        website: ch.website,
        role: ch.role,
      }))
    );

  return error ? 0 : coHosts.length;
}

async function cloneRegistrationForms(
  sourceEventId: string,
  newEventId: string,
  clientId: string
): Promise<{ forms: number; formSections: number; formFields: number }> {
  const { data: forms } = await supabaseAdmin
    .from('registration_forms')
    .select('*')
    .eq('event_id', sourceEventId)
    .is('deleted_at', null);

  if (!forms || forms.length === 0) return { forms: 0, formSections: 0, formFields: 0 };

  const formIdMap = new Map<string, string>();
  const sectionIdMap = new Map<string, string>();

  const clonedForms = forms.map((f) => {
    const newId = crypto.randomUUID();
    formIdMap.set(f.id, newId);
    return {
      id: newId,
      event_id: newEventId,
      client_id: clientId,
      name: f.name,
      is_active: f.is_active,
      is_multi_step: f.is_multi_step,
      steps_config: f.steps_config,
    };
  });

  const { error: formError } = await supabaseAdmin
    .from('registration_forms')
    .insert(clonedForms);

  if (formError) throw new Error(`Failed to clone forms: ${formError.message}`);

  const originalFormIds = forms.map((f) => f.id);

  const { data: sections } = await supabaseAdmin
    .from('form_sections')
    .select('*')
    .in('form_id', originalFormIds);

  let sectionsCloned = 0;
  if (sections && sections.length > 0) {
    const newSections = sections.map((s) => {
      const newId = crypto.randomUUID();
      sectionIdMap.set(s.id, newId);
      return {
        id: newId,
        form_id: formIdMap.get(s.form_id) || newEventId,
        title: s.title,
        description: s.description,
        sort_order: s.sort_order,
        is_collapsible: s.is_collapsible,
        is_collapsed_default: s.is_collapsed_default,
      };
    });

    const { error: secError } = await supabaseAdmin
      .from('form_sections')
      .insert(newSections);
    if (!secError) sectionsCloned = sections.length;
  }

  const { data: fields } = await supabaseAdmin
    .from('form_fields')
    .select('*')
    .in('form_id', originalFormIds);

  let fieldsCloned = 0;
  if (fields && fields.length > 0) {
    const newFields = fields.map((f) => ({
      form_id: formIdMap.get(f.form_id) || newEventId,
      label: f.label,
      field_type: f.field_type,
      placeholder: f.placeholder,
      is_required: f.is_required,
      is_unique: f.is_unique,
      sort_order: f.sort_order,
      options: f.options,
      validation: f.validation,
      conditional_logic: f.conditional_logic,
      section_id: f.section_id ? (sectionIdMap.get(f.section_id) || null) : null,
      default_value: f.default_value,
      help_text: f.help_text,
      is_readonly: f.is_readonly,
      conditional_required: f.conditional_required,
    }));

    const { error: fError } = await supabaseAdmin
      .from('form_fields')
      .insert(newFields);
    if (!fError) fieldsCloned = fields.length;
  }

  return { forms: forms.length, formSections: sectionsCloned, formFields: fieldsCloned };
}

async function cloneTicketTypes(sourceEventId: string, newEventId: string, clientId: string): Promise<number> {
  const { data: types } = await supabaseAdmin
    .from('ticket_types')
    .select('*')
    .eq('event_id', sourceEventId)
    .is('deleted_at', null);

  if (!types || types.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('ticket_types')
    .insert(
      types.map((t) => ({
        event_id: newEventId,
        client_id: clientId,
        name: t.name,
        description: t.description,
        price: t.price,
        currency: t.currency,
        capacity: t.capacity,
        tickets_sold: 0,
        max_per_order: t.max_per_order,
        sales_start: t.sales_start,
        sales_end: t.sales_end,
        is_active: t.is_active,
        sort_order: t.sort_order,
      }))
    );

  return error ? 0 : types.length;
}

async function cloneAttendanceRules(sourceEventId: string, newEventId: string, clientId: string): Promise<number> {
  const { data: rules } = await supabaseAdmin
    .from('attendance_rules')
    .select('*')
    .eq('event_id', sourceEventId)
    .maybeSingle();

  if (!rules) return 0;

  const { error } = await supabaseAdmin
    .from('attendance_rules')
    .insert({
      event_id: newEventId,
      client_id: clientId,
      require_checkout: rules.require_checkout,
      auto_checkout_enabled: rules.auto_checkout_enabled,
      auto_checkout_grace_minutes: rules.auto_checkout_grace_minutes,
    });

  return error ? 0 : 1;
}

async function cloneGates(
  sourceEventId: string,
  newEventId: string,
  clientId: string,
  sessionIdMap?: Map<string, string>
): Promise<{ gates: number; gateSessions: number }> {
  const { data: gates } = await supabaseAdmin
    .from('check_in_stations')
    .select('*')
    .eq('event_id', sourceEventId);

  if (!gates || gates.length === 0) return { gates: 0, gateSessions: 0 };

  const gateIdMap = new Map<string, string>();

  const newGates = gates.map((g) => {
    const newId = crypto.randomUUID();
    gateIdMap.set(g.id, newId);
    return {
      id: newId,
      client_id: clientId,
      event_id: newEventId,
      name: g.name,
      location: g.location,
      gate_type: g.gate_type,
      max_scans_per_min: g.max_scans_per_min,
      assigned_sessions: [],
      auto_checkout_enabled: g.auto_checkout_enabled,
      is_active: false,
    };
  });

  const { error: gateError } = await supabaseAdmin
    .from('check_in_stations')
    .insert(newGates);

  if (gateError) throw new Error(`Failed to clone gates: ${gateError.message}`);

  const originalGateIds = gates.map((g) => g.id);

  const { data: gateSessions } = await supabaseAdmin
    .from('gate_sessions')
    .select('*')
    .in('gate_id', originalGateIds);

  let gateSessionsCloned = 0;
  if (gateSessions && gateSessions.length > 0) {
    const newGateSessions = gateSessions.map((gs) => ({
      gate_id: gateIdMap.get(gs.gate_id) || newEventId,
      session_id: sessionIdMap?.get(gs.session_id) || gs.session_id,
    }));

    const { error: gsError } = await supabaseAdmin
      .from('gate_sessions')
      .insert(newGateSessions);
    if (!gsError) gateSessionsCloned = gateSessions.length;
  }

  return { gates: gates.length, gateSessions: gateSessionsCloned };
}

async function cloneNotificationTemplates(sourceEventId: string, newEventId: string, clientId: string): Promise<number> {
  const { data: templates } = await supabaseAdmin
    .from('notification_templates')
    .select('*')
    .eq('event_id', sourceEventId)
    .is('deleted_at', null);

  if (!templates || templates.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('notification_templates')
    .insert(
      templates.map((t) => ({
        client_id: clientId,
        event_id: newEventId,
        type: t.type,
        name: t.name,
        subject: t.subject,
        body: t.body,
        is_active: t.is_active,
        variables: t.variables,
      }))
    );

  return error ? 0 : templates.length;
}

async function cloneRegistrationLinks(sourceEventId: string, newEventId: string, clientId: string): Promise<number> {
  const { data: links } = await supabaseAdmin
    .from('registration_links')
    .select('*')
    .eq('event_id', sourceEventId);

  if (!links || links.length === 0) return 0;

  const newLinks = links.map((l) => ({
    client_id: clientId,
    event_id: newEventId,
    short_code: generateShortCode(),
    utm_source: l.utm_source,
    utm_medium: l.utm_medium,
    utm_campaign: l.utm_campaign,
    click_count: 0,
    registration_count: 0,
    is_active: l.is_active,
  }));

  const { error } = await supabaseAdmin
    .from('registration_links')
    .insert(newLinks);

  return error ? 0 : links.length;
}

function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

async function cloneCoupons(sourceEventId: string, newEventId: string, clientId: string): Promise<number> {
  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('event_id', sourceEventId);

  if (!coupons || coupons.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('coupons')
    .insert(
      coupons.map((c) => ({
        client_id: clientId,
        event_id: newEventId,
        code: `${c.code}-CLONE`,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        max_uses: c.max_uses,
        current_uses: 0,
        min_order_amount: c.min_order_amount,
        max_discount_amount: c.max_discount_amount,
        starts_at: c.starts_at,
        expires_at: c.expires_at,
        is_active: c.is_active,
      }))
    );

  return error ? 0 : coupons.length;
}

export const eventCloneService = { cloneEvent };
export type { CloneOptions, CloneResult };

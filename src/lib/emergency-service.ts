import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';

interface IncidentInput {
  incident_type: string;
  severity?: string;
  title: string;
  description?: string;
  location?: string;
  reported_by?: string;
  assigned_to?: string;
  status?: string;
}

interface IncidentUpdate {
  status?: string;
  severity?: string;
  assigned_to?: string;
  description?: string;
  location?: string;
  resolved_at?: string;
}

interface ContactInput {
  name: string;
  role: string;
  phone: string;
  email?: string;
  location?: string;
  is_primary?: boolean;
}

interface LostFoundInput {
  item_description: string;
  category?: string;
  found_location?: string;
  found_at?: string;
  reported_by_name?: string;
  reported_by_phone?: string;
  photo_url?: string;
}

interface LostFoundUpdate {
  status?: string;
  claimed_by_name?: string;
  claimed_at?: string;
}

interface IncidentFilters {
  status?: string;
  severity?: string;
  incident_type?: string;
}

interface EmergencyStats {
  active_by_severity: { severity: string; count: number }[];
  active_by_type: { type: string; count: number }[];
  total_active: number;
  total_resolved_today: number;
  total_resolved: number;
  avg_response_time_minutes: number;
  lost_found_pending: number;
  lost_found_total: number;
}

// ─── Incidents ──────────────────────────────────────────────

async function createIncident(clientId: string, eventId: string, input: IncidentInput) {
  const { data, error } = await supabaseAdmin
    .from('emergency_incidents')
    .insert({
      client_id: clientId,
      event_id: eventId,
      incident_type: input.incident_type,
      severity: input.severity || 'medium',
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      reported_by: input.reported_by || null,
      assigned_to: input.assigned_to || null,
      status: input.status || 'open',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create incident: ${error.message}`);
  return data;
}

async function getIncidents(clientId: string, eventId: string, filters?: IncidentFilters) {
  let query = supabaseAdmin
    .from('emergency_incidents')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.incident_type) {
    query = query.eq('incident_type', filters.incident_type);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get incidents: ${error.message}`);
  return data || [];
}

async function updateIncident(clientId: string, incidentId: string, input: IncidentUpdate) {
  const updates: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
  if (input.status === 'resolved' || input.status === 'closed') {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('emergency_incidents')
    .update(updates)
    .eq('id', incidentId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update incident: ${error.message}`);
  return data;
}

// ─── Incident Timeline ──────────────────────────────────────

async function addIncidentTimeline(
  clientId: string,
  incidentId: string,
  action: string,
  notes: string | null,
  performedBy: string
) {
  const { data: incident } = await supabaseAdmin
    .from('emergency_incidents')
    .select('event_id')
    .eq('id', incidentId)
    .single();

  if (!incident) throw new Error('Incident not found');

  const { data, error } = await supabaseAdmin
    .from('incident_timeline')
    .insert({
      client_id: clientId,
      event_id: incident.event_id,
      incident_id: incidentId,
      action,
      notes: notes || null,
      performed_by: performedBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add timeline entry: ${error.message}`);
  return data;
}

async function getIncidentTimeline(clientId: string, incidentId: string) {
  const { data, error } = await supabaseAdmin
    .from('incident_timeline')
    .select('*')
    .eq('client_id', clientId)
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get timeline: ${error.message}`);
  return data || [];
}

// ─── Emergency Contacts ─────────────────────────────────────

async function getEmergencyContacts(clientId: string, eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('emergency_contacts')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to get contacts: ${error.message}`);
  return data || [];
}

async function createEmergencyContact(clientId: string, eventId: string, input: ContactInput) {
  const { data, error } = await supabaseAdmin
    .from('emergency_contacts')
    .insert({
      client_id: clientId,
      event_id: eventId,
      name: input.name,
      role: input.role,
      phone: input.phone,
      email: input.email || null,
      location: input.location || null,
      is_primary: input.is_primary || false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return data;
}

// ─── Lost & Found ───────────────────────────────────────────

async function createLostFoundItem(clientId: string, eventId: string, input: LostFoundInput) {
  const { data, error } = await supabaseAdmin
    .from('lost_found_items')
    .insert({
      client_id: clientId,
      event_id: eventId,
      item_description: input.item_description,
      category: input.category || 'other',
      found_location: input.found_location || null,
      found_at: input.found_at || new Date().toISOString(),
      reported_by_name: input.reported_by_name || null,
      reported_by_phone: input.reported_by_phone || null,
      photo_url: input.photo_url || null,
      status: 'found',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create lost found item: ${error.message}`);
  return data;
}

async function getLostFoundItems(clientId: string, eventId: string, status?: string) {
  let query = supabaseAdmin
    .from('lost_found_items')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get lost found items: ${error.message}`);
  return data || [];
}

async function updateLostFoundItem(clientId: string, itemId: string, input: LostFoundUpdate) {
  const updates: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };

  const { data, error } = await supabaseAdmin
    .from('lost_found_items')
    .update(updates)
    .eq('id', itemId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update lost found item: ${error.message}`);
  return data;
}

// ─── Stats ──────────────────────────────────────────────────

async function getEmergencyStats(clientId: string, eventId: string): Promise<EmergencyStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [incidentsResult, resolvedTodayResult, lostFoundResult, timelineResult] = await Promise.all([
    supabaseAdmin
      .from('emergency_incidents')
      .select('severity, incident_type, status')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .is('deleted_at', null),

    supabaseAdmin
      .from('emergency_incidents')
      .select('id')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .in('status', ['resolved', 'closed'])
      .gte('resolved_at', todayStart.toISOString()),

    supabaseAdmin
      .from('lost_found_items')
      .select('status')
      .eq('client_id', clientId)
      .eq('event_id', eventId),

    supabaseAdmin
      .from('emergency_incidents')
      .select('created_at, resolved_at')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .not('resolved_at', 'is', null),
  ]);

  const incidents = incidentsResult.data || [];
  const lostFound = lostFoundResult.data || [];
  const timeline = timelineResult.data || [];

  const activeIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'in_progress');
  const activeBySeverity = ['critical', 'high', 'medium', 'low'].map((severity) => ({
    severity,
    count: activeIncidents.filter((i) => i.severity === severity).length,
  }));
  const activeByType = [...new Set(activeIncidents.map((i) => i.incident_type))].map((type) => ({
    type,
    count: activeIncidents.filter((i) => i.incident_type === type).length,
  }));

  const avgResponseTime = timeline.length > 0
    ? timeline.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        return sum + (resolved - created);
      }, 0) / timeline.length / 60000
    : 0;

  return {
    active_by_severity: activeBySeverity,
    active_by_type: activeByType,
    total_active: activeIncidents.length,
    total_resolved_today: (resolvedTodayResult.data || []).length,
    total_resolved: incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
    avg_response_time_minutes: Math.round(avgResponseTime * 10) / 10,
    lost_found_pending: lostFound.filter((i) => i.status === 'found').length,
    lost_found_total: lostFound.length,
  };
}

export const emergencyService = {
  createIncident,
  getIncidents,
  updateIncident,
  addIncidentTimeline,
  getIncidentTimeline,
  getEmergencyContacts,
  createEmergencyContact,
  createLostFoundItem,
  getLostFoundItems,
  updateLostFoundItem,
  getEmergencyStats,
};

export type { IncidentInput, IncidentUpdate, ContactInput, LostFoundInput, LostFoundUpdate, IncidentFilters, EmergencyStats };

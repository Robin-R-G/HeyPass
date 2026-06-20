import { supabaseAdmin } from '@/lib/supabase/client';

export type GateType = 'main_entrance' | 'session_gate' | 'exit_gate' | 'vip_lane';
export type GateStaffRole = 'scanner' | 'supervisor' | 'admin';

export interface Gate {
  id: string;
  client_id: string;
  event_id: string;
  name: string;
  location: string | null;
  device_id: string | null;
  staff_id: string | null;
  is_active: boolean;
  last_ping_at: string | null;
  gate_type: GateType;
  max_scans_per_min: number;
  assigned_sessions: string[];
  auto_checkout_enabled: boolean;
  created_at: string;
}

export interface GateStaff {
  id: string;
  gate_id: string;
  staff_id: string;
  role: GateStaffRole;
  shift_start: string | null;
  shift_end: string | null;
  is_active: boolean;
  staff_name?: string;
  staff_email?: string;
}

export interface GateStats {
  gate_id: string;
  event_id: string;
  total_scans: number;
  successful_checkins: number;
  successful_checkouts: number;
  duplicates_blocked: number;
  invalid_rejected: number;
  fraud_suspected: number;
  last_scan_at: string | null;
}

export interface CreateGateInput {
  name: string;
  location?: string;
  gate_type?: GateType;
  max_scans_per_min?: number;
  assigned_sessions?: string[];
}

export class GateService {
  // ─── GATE CRUD ───────────────────────────────────────

  async listGates(clientId: string, eventId: string): Promise<Gate[]> {
    const { data, error } = await supabaseAdmin
      .from('check_in_stations')
      .select('*')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getGate(clientId: string, gateId: string): Promise<Gate | null> {
    const { data, error } = await supabaseAdmin
      .from('check_in_stations')
      .select('*')
      .eq('client_id', clientId)
      .eq('id', gateId)
      .single();

    if (error) return null;
    return data;
  }

  async createGate(clientId: string, eventId: string, input: CreateGateInput): Promise<Gate> {
    const { data, error } = await supabaseAdmin
      .from('check_in_stations')
      .insert({
        client_id: clientId,
        event_id: eventId,
        name: input.name,
        location: input.location || null,
        gate_type: input.gate_type || 'main_entrance',
        max_scans_per_min: input.max_scans_per_min || 60,
        assigned_sessions: input.assigned_sessions || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize gate stats
    await supabaseAdmin
      .from('gate_stats')
      .insert({
        gate_id: data.id,
        event_id: eventId,
        client_id: clientId,
      });

    return data;
  }

  async updateGate(clientId: string, gateId: string, updates: Partial<CreateGateInput & { is_active: boolean }>): Promise<Gate> {
    const { data, error } = await supabaseAdmin
      .from('check_in_stations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gateId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteGate(clientId: string, gateId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('check_in_stations')
      .delete()
      .eq('id', gateId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  async toggleGate(clientId: string, gateId: string): Promise<Gate> {
    const gate = await this.getGate(clientId, gateId);
    if (!gate) throw new Error('Gate not found');
    return this.updateGate(clientId, gateId, { is_active: !gate.is_active });
  }

  // ─── GATE SESSIONS ───────────────────────────────────

  async assignSessions(clientId: string, gateId: string, sessionIds: string[]): Promise<void> {
    // Verify gate belongs to client
    const gate = await this.getGate(clientId, gateId);
    if (!gate) throw new Error('Gate not found');

    // Remove existing assignments
    await supabaseAdmin
      .from('gate_sessions')
      .delete()
      .eq('gate_id', gateId);

    // Add new assignments
    if (sessionIds.length > 0) {
      const inserts = sessionIds.map(sid => ({
        gate_id: gateId,
        session_id: sid,
      }));
      await supabaseAdmin.from('gate_sessions').insert(inserts);
    }

    // Update gate's assigned_sessions column
    await supabaseAdmin
      .from('check_in_stations')
      .update({ assigned_sessions: sessionIds })
      .eq('id', gateId);
  }

  async getGateSessions(gateId: string) {
    const { data, error } = await supabaseAdmin
      .from('gate_sessions')
      .select('session_id, sessions(id, title, start_time, end_time, status)')
      .eq('gate_id', gateId);

    if (error) throw error;
    return data;
  }

  // ─── GATE STAFF ──────────────────────────────────────

  async listGateStaff(clientId: string, gateId: string): Promise<GateStaff[]> {
    const { data, error } = await supabaseAdmin
      .from('gate_staff')
      .select(`
        *,
        staff:users(id, first_name, last_name, email)
      `)
      .eq('gate_id', gateId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((s: Record<string, unknown>) => ({
      ...s,
      staff_name: s.staff ? `${(s.staff as Record<string, string>).first_name} ${(s.staff as Record<string, string>).last_name}` : 'Unknown',
      staff_email: (s.staff as Record<string, string>)?.email,
    }));
  }

  async assignStaff(clientId: string, gateId: string, staffId: string, role: GateStaffRole = 'scanner'): Promise<GateStaff> {
    const gate = await this.getGate(clientId, gateId);
    if (!gate) throw new Error('Gate not found');

    const { data, error } = await supabaseAdmin
      .from('gate_staff')
      .upsert({
        gate_id: gateId,
        staff_id: staffId,
        role,
        is_active: true,
        shift_start: new Date().toISOString(),
      }, { onConflict: 'gate_id,staff_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeStaff(clientId: string, gateId: string, staffId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('gate_staff')
      .update({ is_active: false, shift_end: new Date().toISOString() })
      .eq('gate_id', gateId)
      .eq('staff_id', staffId);

    if (error) throw error;
  }

  async getStaffPerformance(clientId: string, eventId: string) {
    const { data, error } = await supabaseAdmin
      .from('staff_performance')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  }

  // ─── GATE STATS ──────────────────────────────────────

  async getGateStats(clientId: string, eventId: string): Promise<GateStats[]> {
    const { data, error } = await supabaseAdmin
      .from('gate_stats')
      .select('*')
      .eq('client_id', clientId)
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  }

  async getGatePerformance(clientId: string, eventId: string) {
    const { data, error } = await supabaseAdmin
      .from('gate_performance')
      .select('*')
      .eq('client_id', clientId)
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  }

  // ─── LIVE GATE FEED (SSE helper) ─────────────────────

  async getGateLiveFeed(gateId: string, since: string) {
    const { data, error } = await supabaseAdmin
      .from('check_ins')
      .select(`
        id, scan_type, scanned_at, qr_data,
        ticket:tickets(ticket_number),
        registration:registrations(first_name, last_name, email),
        staff:users(first_name, last_name)
      `)
      .eq('station_id', gateId)
      .gte('scanned_at', since)
      .order('scanned_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }
}

export const gateService = new GateService();

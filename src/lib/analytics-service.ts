import { supabaseAdmin } from '@/lib/supabase/client';

export interface DashboardOverview {
  total_registered: number;
  total_checked_in: number;
  total_checked_out: number;
  attendance_rate: number;
  no_show_rate: number;
  total_revenue: number;
  revenue_trend: number;
  total_certificates: number;
  certificates_downloaded: number;
  active_volunteers: number;
  active_gates: number;
}

export interface AttendanceAnalytics {
  timeline: { date: string; check_ins: number; check_outs: number }[];
  by_gate: { gate_name: string; type: string; check_ins: number; check_outs: number }[];
  by_hour: { hour: number; count: number }[];
  by_day: { day: string; count: number }[];
  peak_hours: { hour: number; avg_count: number }[];
  no_shows: { total: number; rate: number };
}

export interface RevenueAnalytics {
  timeline: { date: string; revenue: number }[];
  by_source: { source: string; amount: number; count: number }[];
  by_ticket_type: { type: string; count: number; revenue: number }[];
  by_session: { session_title: string; revenue: number; registrations: number }[];
  by_payment_method: { method: string; count: number; amount: number }[];
  total: number;
  refunds: { count: number; amount: number };
}

export interface VolunteerAnalytics {
  top_performers: {
    volunteer_id: string;
    name: string;
    hours: number;
    tasks_completed: number;
    shifts_attended: number;
    shifts_total: number;
  }[];
  hours_distribution: { range: string; count: number }[];
  shift_coverage: { date: string; total_shifts: number; filled_shifts: number }[];
  activity_log: { timestamp: string; volunteer_name: string; action: string; gate: string }[];
}

export interface CertificateAnalytics {
  timeline: { date: string; generated: number; downloaded: number; revoked: number }[];
  by_type: { type: string; count: number }[];
  download_rate: { total: number; downloaded: number; rate: number };
  revocation_rate: { total: number; revoked: number; rate: number };
  recent_verifications: { certificate_number: string; method: string; verified_at: string }[];
}

export interface RealtimeMetrics {
  check_ins_last_5min: number;
  check_ins_last_30min: number;
  active_scanners: number;
  gates_open: number;
  gates_total: number;
  registrations_last_hour: number;
  certificates_generated_last_hour: number;
}

class AnalyticsServiceImpl {
  async getOverview(clientId: string, eventId: string): Promise<DashboardOverview> {
    const [registered, checkedIn, checkedOut, revenue, certificates, volunteers, gates] = await Promise.all([
      supabaseAdmin
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .eq('status', 'confirmed')
        .is('deleted_at', null),

      supabaseAdmin
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('check_outs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .eq('status', 'completed'),

      supabaseAdmin
        .from('certificates')
        .select('id, status', { count: 'exact' })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .is('deleted_at', null),

      supabaseAdmin
        .from('gate_staff')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .eq('status', 'on_duty'),

      supabaseAdmin
        .from('gate_sessions')
        .select('id, status')
        .eq('client_id', clientId)
        .eq('event_id', eventId),
    ]);

    const totalRegistered = registered.count || 0;
    const totalCheckedIn = checkedIn.count || 0;
    const totalCheckedOut = checkedOut.count || 0;
    const totalRevenue = (revenue.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const certData = certificates.data || [];
    const activeGates = (gates.data || []).filter(g => g.status === 'active').length;

    return {
      total_registered: totalRegistered,
      total_checked_in: totalCheckedIn,
      total_checked_out: totalCheckedOut,
      attendance_rate: totalRegistered > 0 ? (totalCheckedIn / totalRegistered) * 100 : 0,
      no_show_rate: totalRegistered > 0 ? ((totalRegistered - totalCheckedIn) / totalRegistered) * 100 : 0,
      total_revenue: totalRevenue,
      revenue_trend: 0,
      total_certificates: certificates.count || 0,
      certificates_downloaded: certData.filter(c => c.status === 'downloaded').length,
      active_volunteers: volunteers.count || 0,
      active_gates: activeGates,
    };
  }

  async getAttendance(clientId: string, eventId: string, days: number = 30): Promise<AttendanceAnalytics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [checkIns, checkOuts, gates, offline] = await Promise.all([
      supabaseAdmin
        .from('check_ins')
        .select('id, scanned_at, gate_id')
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .gte('scanned_at', since),

      supabaseAdmin
        .from('check_outs')
        .select('id, scanned_at, gate_id')
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .gte('scanned_at', since),

      supabaseAdmin
        .from('gate_sessions')
        .select('id, gate_name, gate_type')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .eq('status', 'confirmed')
        .is('deleted_at', null),
    ]);

    const gateMap = new Map<string, { name: string; type: string }>((gates.data || []).map((g: any) => [g.id, { name: g.gate_name, type: g.gate_type }]));

    // Timeline by date
    const timelineMap = new Map<string, { check_ins: number; check_outs: number }>();
    for (const ci of checkIns.data || []) {
      const date = ci.scanned_at.split('T')[0];
      const existing = timelineMap.get(date) || { check_ins: 0, check_outs: 0 };
      existing.check_ins++;
      timelineMap.set(date, existing);
    }
    for (const co of checkOuts.data || []) {
      const date = co.scanned_at.split('T')[0];
      const existing = timelineMap.get(date) || { check_ins: 0, check_outs: 0 };
      existing.check_outs++;
      timelineMap.set(date, existing);
    }
    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By gate
    const gateStats = new Map<string, { gate_name: string; type: string; check_ins: number; check_outs: number }>();
    for (const ci of checkIns.data || []) {
      const gate = gateMap.get(ci.gate_id);
      if (!gate) continue;
      const key = ci.gate_id;
      const existing = gateStats.get(key) || { gate_name: gate.name, type: gate.type, check_ins: 0, check_outs: 0 };
      existing.check_ins++;
      gateStats.set(key, existing);
    }
    for (const co of checkOuts.data || []) {
      const gate = gateMap.get(co.gate_id);
      if (!gate) continue;
      const key = co.gate_id;
      const existing = gateStats.get(key) || { gate_name: gate.name, type: gate.type, check_ins: 0, check_outs: 0 };
      existing.check_outs++;
      gateStats.set(key, existing);
    }

    // By hour
    const hourMap = new Map<number, number>();
    for (const ci of checkIns.data || []) {
      const hour = new Date(ci.scanned_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
    const by_hour = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));

    // Peak hours (average per day)
    const dayCount = days || 1;
    const peak_hours = by_hour.map(h => ({ hour: h.hour, avg_count: h.count / dayCount }));

    const totalRegistered = offline.count || 0;
    const totalCheckedIn = (checkIns.data || []).length;

    return {
      timeline,
      by_gate: Array.from(gateStats.values()),
      by_hour,
      by_day: [],
      peak_hours,
      no_shows: {
        total: totalRegistered - totalCheckedIn,
        rate: totalRegistered > 0 ? ((totalRegistered - totalCheckedIn) / totalRegistered) * 100 : 0,
      },
    };
  }

  async getRevenue(clientId: string, eventId: string): Promise<RevenueAnalytics> {
    const [payments, tickets, sessions, methods] = await Promise.all([
      supabaseAdmin
        .from('payments')
        .select('id, amount, method, status, created_at')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('tickets')
        .select('id, ticket_type, price')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('session_attendance')
        .select('id, amount_paid, sessions(title)')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('payment_methods')
        .select('id, type, bank_name, upi_id')
        .eq('client_id', clientId),
    ]);

    const completedPayments = (payments.data || []).filter(p => p.status === 'completed');
    const total = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Timeline
    const timelineMap = new Map<string, number>();
    for (const p of completedPayments) {
      const date = p.created_at.split('T')[0];
      timelineMap.set(date, (timelineMap.get(date) || 0) + (p.amount || 0));
    }
    const timeline = Array.from(timelineMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By payment method
    const methodMap = new Map<string, { count: number; amount: number }>();
    for (const p of completedPayments) {
      const method = p.method || 'unknown';
      const existing = methodMap.get(method) || { count: 0, amount: 0 };
      existing.count++;
      existing.amount += p.amount || 0;
      methodMap.set(method, existing);
    }
    const by_payment_method = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }));

    // Refunds
    const refunds = (payments.data || []).filter(p => p.status === 'refunded');

    return {
      timeline,
      by_source: [],
      by_ticket_type: [],
      by_session: [],
      by_payment_method,
      total,
      refunds: {
        count: refunds.length,
        amount: refunds.reduce((sum, p) => sum + (p.amount || 0), 0),
      },
    };
  }

  async getVolunteers(clientId: string, eventId: string): Promise<VolunteerAnalytics> {
    const [staff, shifts, stats] = await Promise.all([
      supabaseAdmin
        .from('gate_staff')
        .select('id, user_id, users(name), status, started_at, ended_at')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('staff_shifts')
        .select('id, user_id, users(name), shift_start, shift_end, status')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('gate_stats')
        .select('gate_id, scans_total, scans_manual')
        .eq('client_id', clientId)
        .eq('event_id', eventId),
    ]);

    // Calculate hours per volunteer
    const volunteerMap = new Map<string, {
      name: string;
      hours: number;
      tasks_completed: number;
      shifts_attended: number;
      shifts_total: number;
    }>();

    for (const s of staff.data || []) {
      const name = (s as any).users?.name || 'Unknown';
      const existing = volunteerMap.get(s.user_id) || {
        name,
        hours: 0,
        tasks_completed: 0,
        shifts_attended: 0,
        shifts_total: 0,
      };
      if (s.started_at && s.ended_at) {
        existing.hours += (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60 * 60);
      }
      existing.shifts_attended++;
      volunteerMap.set(s.user_id, existing);
    }

    for (const sh of shifts.data || []) {
      const existing = volunteerMap.get(sh.user_id);
      if (existing) {
        existing.shifts_total++;
      }
    }

    const top_performers = Array.from(volunteerMap.entries())
      .map(([volunteer_id, data]) => ({ volunteer_id, ...data }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    return {
      top_performers,
      hours_distribution: [],
      shift_coverage: [],
      activity_log: [],
    };
  }

  async getCertificates(clientId: string, eventId: string): Promise<CertificateAnalytics> {
    const [certs, verifications] = await Promise.all([
      supabaseAdmin
        .from('certificates')
        .select('id, status, type_id, certificate_types(name), issued_at')
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .is('deleted_at', null),

      supabaseAdmin
        .from('certificate_verifications')
        .select('certificate_id, method, verified_at')
        .eq('client_id', clientId)
        .gte('verified_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const certData = certs.data || [];
    const total = certData.length;
    const downloaded = certData.filter(c => c.status === 'downloaded').length;
    const revoked = certData.filter(c => c.status === 'revoked').length;

    // Timeline
    const timelineMap = new Map<string, { generated: number; downloaded: number; revoked: number }>();
    for (const c of certData) {
      const date = c.issued_at.split('T')[0];
      const existing = timelineMap.get(date) || { generated: 0, downloaded: 0, revoked: 0 };
      existing.generated++;
      if (c.status === 'downloaded') existing.downloaded++;
      if (c.status === 'revoked') existing.revoked++;
      timelineMap.set(date, existing);
    }
    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By type
    const typeMap = new Map<string, number>();
    for (const c of certData) {
      const type = (c as any).certificate_types?.name || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }
    const by_type = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    return {
      timeline,
      by_type,
      download_rate: { total, downloaded, rate: total > 0 ? (downloaded / total) * 100 : 0 },
      revocation_rate: { total, revoked, rate: total > 0 ? (revoked / total) * 100 : 0 },
      recent_verifications: [],
    };
  }

  async getRealtime(clientId: string, eventId: string): Promise<RealtimeMetrics> {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const [checkIns5, checkIns30, scanners, gates, regsHour, certsHour] = await Promise.all([
      supabaseAdmin
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .gte('scanned_at', fiveMinAgo),

      supabaseAdmin
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .gte('scanned_at', thirtyMinAgo),

      supabaseAdmin
        .from('gate_staff')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .eq('status', 'on_duty'),

      supabaseAdmin
        .from('gate_sessions')
        .select('id, status')
        .eq('client_id', clientId)
        .eq('event_id', eventId),

      supabaseAdmin
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .gte('created_at', oneHourAgo),

      supabaseAdmin
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('event_id', eventId)
        .gte('created_at', oneHourAgo),
    ]);

    const gatesData = gates.data || [];

    return {
      check_ins_last_5min: checkIns5.count || 0,
      check_ins_last_30min: checkIns30.count || 0,
      active_scanners: scanners.count || 0,
      gates_open: gatesData.filter(g => g.status === 'active').length,
      gates_total: gatesData.length,
      registrations_last_hour: regsHour.count || 0,
      certificates_generated_last_hour: certsHour.count || 0,
    };
  }
}

export const analyticsService = new AnalyticsServiceImpl();

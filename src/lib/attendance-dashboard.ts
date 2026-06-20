import { supabaseAdmin } from '@/lib/supabase/client';

export interface DashboardMetrics {
  total_registered: number;
  total_checked_in: number;
  total_checked_out: number;
  currently_inside: number;
  check_in_rate: number;
  avg_duration_minutes: number;
  peak_hour: string;
  gate_breakdown: GateBreakdown[];
  hourly_distribution: HourlyDistribution[];
  session_breakdown: SessionBreakdown[];
}

export interface GateBreakdown {
  gate_id: string;
  gate_name: string;
  gate_type: string;
  total_scans: number;
  checkins: number;
  checkouts: number;
  duplicates_blocked: number;
  fraud_suspected: number;
  is_active: boolean;
  active_staff: number;
  last_scan_at: string | null;
}

export interface HourlyDistribution {
  hour: number;
  checkins: number;
  checkouts: number;
}

export interface SessionBreakdown {
  session_id: string;
  session_title: string;
  start_time: string;
  end_time: string;
  status: string;
  total_registered: number;
  total_checked_in: number;
  total_checked_out: number;
  attendance_percentage: number;
}

export class AttendanceDashboardService {
  async getFullDashboard(clientId: string, eventId: string): Promise<DashboardMetrics> {
    const [registrationStats, gatePerformance, sessionData, hourlyData] = await Promise.all([
      this.getRegistrationStats(eventId),
      this.getGateBreakdown(clientId, eventId),
      this.getSessionBreakdown(clientId, eventId),
      this.getHourlyDistribution(eventId),
    ]);

    const currentlyInside = registrationStats.total_checked_in - registrationStats.total_checked_out;
    const checkInRate = registrationStats.total_registered > 0
      ? Math.round((registrationStats.total_checked_in / registrationStats.total_registered) * 10000) / 100
      : 0;

    const avgDuration = await this.getAverageDuration(eventId);
    const peakHour = this.findPeakHour(hourlyData);

    return {
      total_registered: registrationStats.total_registered,
      total_checked_in: registrationStats.total_checked_in,
      total_checked_out: registrationStats.total_checked_out,
      currently_inside: currentlyInside,
      check_in_rate: checkInRate,
      avg_duration_minutes: avgDuration,
      peak_hour: peakHour,
      gate_breakdown: gatePerformance,
      hourly_distribution: hourlyData,
      session_breakdown: sessionData,
    };
  }

  private async getRegistrationStats(eventId: string) {
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const regs = registrations || [];
    return {
      total_registered: regs.filter(r => ['confirmed', 'checked_in', 'checked_out'].includes(r.status)).length,
      total_checked_in: regs.filter(r => ['checked_in', 'checked_out'].includes(r.status)).length,
      total_checked_out: regs.filter(r => r.status === 'checked_out').length,
    };
  }

  private async getGateBreakdown(clientId: string, eventId: string): Promise<GateBreakdown[]> {
    const { data } = await supabaseAdmin
      .from('gate_performance')
      .select('*')
      .eq('client_id', clientId)
      .eq('event_id', eventId);

    return (data || []).map((g: Record<string, unknown>) => ({
      gate_id: g.gate_id,
      gate_name: g.gate_name,
      gate_type: g.gate_type,
      total_scans: g.total_scans || 0,
      checkins: g.successful_checkins || 0,
      checkouts: g.successful_checkouts || 0,
      duplicates_blocked: g.duplicates_blocked || 0,
      fraud_suspected: g.fraud_suspected || 0,
      is_active: g.is_active,
      active_staff: g.active_staff || 0,
      last_scan_at: g.last_scan_at,
    }));
  }

  private async getSessionBreakdown(clientId: string, eventId: string): Promise<SessionBreakdown[]> {
    const { data } = await supabaseAdmin
      .from('session_attendance')
      .select(`
        session_id, total_registered, total_checked_in, total_checked_out,
        session:sessions(id, title, start_time, end_time, status)
      `)
      .eq('event_id', eventId)
      .eq('client_id', clientId);

    return (data || []).map((s: Record<string, unknown>) => {
      const session = s.session as Record<string, unknown> | null;
      const totalRegistered = (s.total_registered as number) || 0;
      const totalCheckedIn = (s.total_checked_in as number) || 0;
      const pct = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 10000) / 100 : 0;

      return {
        session_id: s.session_id,
        session_title: (session?.title as string) || 'Unknown',
        start_time: (session?.start_time as string) || '',
        end_time: (session?.end_time as string) || '',
        status: (session?.status as string) || 'unknown',
        total_registered: totalRegistered,
        total_checked_in: totalCheckedIn,
        total_checked_out: (s.total_checked_out as number) || 0,
        attendance_percentage: pct,
      };
    });
  }

  private async getHourlyDistribution(eventId: string): Promise<HourlyDistribution[]> {
    const { data } = await supabaseAdmin
      .from('check_ins')
      .select('scan_type, scanned_at')
      .eq('event_id', eventId);

    const hourly: Record<number, { checkins: number; checkouts: number }> = {};
    for (let h = 0; h < 24; h++) hourly[h] = { checkins: 0, checkouts: 0 };

    (data || []).forEach((row: { scan_type: string; scanned_at: string }) => {
      const hour = new Date(row.scanned_at).getHours();
      if (row.scan_type === 'check_in') hourly[hour].checkins++;
      else hourly[hour].checkouts++;
    });

    return Object.entries(hourly).map(([h, v]) => ({
      hour: parseInt(h),
      checkins: v.checkins,
      checkouts: v.checkouts,
    }));
  }

  private async getAverageDuration(eventId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('check_outs')
      .select('duration_minutes')
      .eq('event_id', eventId)
      .not('duration_minutes', 'is', null);

    const durations = (data || []).map((d: { duration_minutes: number }) => d.duration_minutes).filter(d => d > 0);
    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }

  private findPeakHour(hourly: HourlyDistribution[]): string {
    const peak = hourly.reduce((max, h) => h.checkins > max.checkins ? h : max, hourly[0]);
    return `${String(peak.hour).padStart(2, '0')}:00`;
  }

  // ─── EXPORT ATTENDANCE ───────────────────────────────

  async exportAttendance(clientId: string, eventId: string) {
    const { data, error } = await supabaseAdmin
      .from('attendance_summary')
      .select(`
        registration_id, check_in_time, check_out_time, duration_minutes,
        attendance_percentage, is_eligible, eligibility_reason,
        registration:registrations(first_name, last_name, email, phone, ticket_number)
      `)
      .eq('client_id', clientId)
      .eq('event_id', eventId);

    if (error) throw error;
    return data;
  }
}

export const attendanceDashboard = new AttendanceDashboardService();

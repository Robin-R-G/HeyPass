import { supabaseAdmin } from '@/lib/supabase/client';

export interface EligibilityResult {
  registration_id: string;
  attendee_name: string;
  attendee_email: string;
  is_eligible: boolean;
  eligibility_reason: string;
  attendance_percentage: number;
  sessions_attended: number;
  total_sessions: number;
  total_duration_minutes: number;
  check_in_time: string | null;
  check_out_time: string | null;
}

export class EligibilityService {
  /**
   * Calculate eligibility for all registrations in an event
   */
  async calculateForEvent(clientId: string, eventId: string): Promise<EligibilityResult[]> {
    // Get attendance rules
    const { data: rules } = await supabaseAdmin
      .from('attendance_rules')
      .select('*')
      .eq('event_id', eventId)
      .single();

    // Get all registrations with attendance data
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select(`
        id, first_name, last_name, email,
        attendance_summary!registration_id(
          check_in_time, check_out_time, duration_minutes,
          attendance_percentage, is_eligible, eligibility_reason
        )
      `)
      .eq('event_id', eventId)
      .eq('client_id', clientId)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .is('deleted_at', null);

    // Get sessions attended per registration
    const { data: sessionCheckins } = await supabaseAdmin
      .from('check_ins')
      .select('registration_id, session_id')
      .eq('event_id', eventId)
      .eq('client_id', clientId)
      .not('session_id', 'is', null);

    // Get total sessions for event
    const { count: totalSessions } = await supabaseAdmin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const totalSessionsCount = totalSessions || 0;

    return (registrations || []).map((reg: Record<string, unknown>) => {
      const summary = Array.isArray(reg.attendance_summary)
        ? reg.attendance_summary[0]
        : reg.attendance_summary;

      const sessionsAttended = new Set(
        (sessionCheckins || [])
          .filter((sc: Record<string, string>) => sc.registration_id === reg.id)
          .map((sc: Record<string, string>) => sc.session_id)
      ).size;

      const result: EligibilityResult = {
        registration_id: reg.id as string,
        attendee_name: `${reg.first_name} ${reg.last_name}` as string,
        attendee_email: reg.email as string,
        is_eligible: false,
        eligibility_reason: '',
        attendance_percentage: (summary as Record<string, number>)?.attendance_percentage || 0,
        sessions_attended: sessionsAttended,
        total_sessions: totalSessionsCount,
        total_duration_minutes: (summary as Record<string, number>)?.duration_minutes || 0,
        check_in_time: (summary as Record<string, string>)?.check_in_time || null,
        check_out_time: (summary as Record<string, string>)?.check_out_time || null,
      };

      if (!rules) {
        // No rules = eligible if checked in
        result.is_eligible = !!summary?.check_in_time;
        result.eligibility_reason = result.is_eligible ? 'Attended event' : 'Did not attend';
        return result;
      }

      // Check eligibility rules
      const reasons: string[] = [];
      let eligible = true;

      // Rule: require checkout
      if (rules.require_checkout && !result.check_out_time) {
        eligible = false;
        reasons.push('Did not check out');
      }

      // Rule: minimum duration
      if (rules.min_duration_minutes && result.total_duration_minutes < rules.min_duration_minutes) {
        eligible = false;
        reasons.push(`Duration ${result.total_duration_minutes}m < required ${rules.min_duration_minutes}m`);
      }

      // Rule: minimum sessions
      if (rules.min_sessions_attended && sessionsAttended < rules.min_sessions_attended) {
        eligible = false;
        reasons.push(`Attended ${sessionsAttended}/${rules.min_sessions_attended} required sessions`);
      }

      // Rule: required sessions
      if (rules.required_session_ids?.length) {
        const requiredAttended = rules.required_session_ids.filter(
          (sid: string) => sessionCheckins?.some(
            (sc: Record<string, string>) => sc.registration_id === reg.id && sc.session_id === sid
          )
        ).length;
        if (requiredAttended < rules.required_session_ids.length) {
          eligible = false;
          reasons.push(`Missed ${rules.required_session_ids.length - requiredAttended} required sessions`);
        }
      }

      // Rule: duration percentage
      if (rules.duration_percentage_threshold && result.attendance_percentage < rules.duration_percentage_threshold) {
        eligible = false;
        reasons.push(`Attendance ${result.attendance_percentage}% < required ${rules.duration_percentage_threshold}%`);
      }

      result.is_eligible = eligible;
      result.eligibility_reason = eligible
        ? 'Meets all attendance requirements'
        : reasons.join('; ');

      return result;
    });
  }
}

export const eligibilityService = new EligibilityService();

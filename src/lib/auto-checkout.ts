import { supabaseAdmin } from '@/lib/supabase/client';

export interface AutoCheckoutResult {
  event_id: string;
  tickets_processed: number;
  checkouts_created: number;
  errors: string[];
}

export class AutoCheckoutService {
  /**
   * Process auto-checkout for events that have ended
   * Triggered by cron or manual invocation
   */
  async processExpiredEvents(): Promise<AutoCheckoutResult[]> {
    // Find events where end_date + grace period has passed
    const { data: events } = await supabaseAdmin
      .from('events')
      .select(`
        id, client_id, title,
        attendance_rules!event_id(auto_checkout_enabled, auto_checkout_grace_minutes)
      `)
      .eq('status', 'completed')
      .is('deleted_at', null);

    const results: AutoCheckoutResult[] = [];

    for (const event of (events || [])) {
      const rules = Array.isArray(event.attendance_rules)
        ? event.attendance_rules[0]
        : event.attendance_rules;

      if (!rules?.auto_checkout_enabled) continue;

      const graceMinutes = rules.auto_checkout_grace_minutes || 60;
      const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000).toISOString();

      const result = await this.processEvent(event.id, event.client_id, cutoff);
      results.push(result);
    }

    return results;
  }

  /**
   * Process auto-checkout for a single event
   */
  async processEvent(eventId: string, clientId: string, cutoffTime: string): Promise<AutoCheckoutResult> {
    const result: AutoCheckoutResult = {
      event_id: eventId,
      tickets_processed: 0,
      checkouts_created: 0,
      errors: [],
    };

    // Find tickets that are checked in but not checked out, and check-in was before cutoff
    const { data: staleCheckins, error: fetchError } = await supabaseAdmin
      .from('check_ins')
      .select(`
        id, ticket_id, registration_id, station_id, staff_id, scanned_at, event_id, client_id
      `)
      .eq('event_id', eventId)
      .eq('client_id', clientId)
      .eq('scan_type', 'check_in')
      .lt('scanned_at', cutoffTime)
      .order('scanned_at', { ascending: true });

    if (fetchError) {
      result.errors.push(`Failed to fetch check-ins: ${fetchError.message}`);
      return result;
    }

    for (const checkin of (staleCheckins || [])) {
      // Check if already checked out
      const { data: existingCheckout } = await supabaseAdmin
        .from('check_outs')
        .select('id')
        .eq('check_in_id', checkin.id)
        .limit(1)
        .single();

      if (existingCheckout) continue;

      // Create auto checkout
      const now = new Date().toISOString();
      const durationMinutes = Math.round(
        (Date.now() - new Date(checkin.scanned_at).getTime()) / 60000
      );

      const { error: checkoutError } = await supabaseAdmin
        .from('check_outs')
        .insert({
          client_id: checkin.client_id,
          event_id: checkin.event_id,
          check_in_id: checkin.id,
          registration_id: checkin.registration_id,
          ticket_id: checkin.ticket_id,
          staff_id: null,
          station_id: null,
          scanned_at: now,
          auto_checkout: true,
          duration_minutes: durationMinutes,
        });

      if (checkoutError) {
        result.errors.push(`Failed checkout for ticket ${checkin.ticket_id}: ${checkoutError.message}`);
        continue;
      }

      // Update ticket
      await supabaseAdmin
        .from('tickets')
        .update({ checked_out_at: now })
        .eq('id', checkin.ticket_id);

      // Update registration status
      await supabaseAdmin
        .from('registrations')
        .update({ status: 'checked_out', checked_out_at: now })
        .eq('id', checkin.registration_id);



      result.tickets_processed++;
      result.checkouts_created++;
    }

    return result;
  }
}

export const autoCheckoutService = new AutoCheckoutService();

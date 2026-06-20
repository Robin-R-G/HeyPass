import { supabaseAdmin } from '@/lib/supabase/client';
import { verifyQRPayload, decodeQRString, getQRExpiryMinutes } from './qr-crypto';
import { checkRateLimit } from './cache';
import crypto from 'crypto';

export type ScanResult = 'success' | 'duplicate' | 'expired' | 'invalid' | 'fraud_suspected' | 'already_checked_in';

export interface ScanResponse {
  result: ScanResult;
  message: string;
  ticket_id?: string;
  registration_id?: string;
  attendee_name?: string;
  attendee_email?: string;
  event_title?: string;
  session_title?: string;
  ticket_number?: string;
  checked_in_at?: string;
  rejection_reason?: string;
}

export class ScanValidationService {
  /**
   * Validate a scanned QR string and process check-in/check-out
   */
  async validate(params: {
    qr_string: string;
    event_id: string;
    client_id: string;
    station_id?: string;
    staff_id?: string;
    scan_type?: 'check_in' | 'check_out';
    ip_address?: string;
    device_id?: string;
  }): Promise<ScanResponse> {
    const {
      qr_string, event_id, client_id, station_id, staff_id,
      scan_type = 'check_in', ip_address, device_id,
    } = params;

    // 1. Rate limit: 60 scans per station per minute
    if (station_id) {
      const { allowed } = await checkRateLimit(`scan:station:${station_id}`, 60, 60);
      if (!allowed) {
        return { result: 'invalid', message: 'Scan rate limit exceeded. Please wait.' };
      }
    }

    // 2. Parse QR string
    const payload = decodeQRString(qr_string);
    if (!payload) {
      await this.logScanAttempt({
        client_id, event_id, scan_result: 'invalid',
        rejection_reason: 'Malformed QR code',
        ip_address, device_id, station_id, staff_id, qr_payload: { raw: qr_string },
      });
      return { result: 'invalid', message: 'Invalid QR code format' };
    }

    // 3. Verify HMAC signature and expiry
    const verification = verifyQRPayload(payload);
    if (!verification.valid) {
      await this.logScanAttempt({
        client_id, event_id, scan_result: verification.reason?.includes('expired') ? 'expired' : 'invalid',
        rejection_reason: verification.reason,
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });
      return {
        result: verification.reason?.includes('expired') ? 'expired' : 'invalid',
        message: verification.reason || 'QR verification failed',
      };
    }

    // 4. Find ticket by ID prefix (need to match full ID)
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select(`
        id, ticket_number, registration_id, event_id, client_id, status,
        checked_in_at, checked_out_at, qr_version
      `)
      .eq('client_id', client_id)
      .eq('event_id', event_id)
      .like('id', `${payload.tid}%`)
      .single();

    if (!ticket) {
      await this.logScanAttempt({
        client_id, event_id, scan_result: 'invalid',
        rejection_reason: 'Ticket not found for this event',
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });
      return { result: 'invalid', message: 'Ticket not found for this event' };
    }

    // 5. Check ticket status
    if (ticket.status === 'cancelled') {
      await this.logScanAttempt({
        client_id, event_id, ticket_id: ticket.id, scan_result: 'fraud_suspected',
        rejection_reason: 'Scanned cancelled ticket',
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });
      return { result: 'fraud_suspected', message: 'This ticket has been cancelled' };
    }

    if (ticket.status === 'transferred') {
      await this.logScanAttempt({
        client_id, event_id, ticket_id: ticket.id, scan_result: 'fraud_suspected',
        rejection_reason: 'Scanned transferred ticket',
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });
      return { result: 'fraud_suspected', message: 'This ticket has been transferred' };
    }

    // 6. Check nonce hasn't been used before (replay detection)
    const { data: usedNonce } = await supabaseAdmin
      .from('qr_nonces')
      .select('id, used_at')
      .eq('ticket_id', ticket.id)
      .eq('nonce', payload.n)
      .single();

    if (usedNonce && usedNonce.used_at) {
      // Nonce was already used — possible replay
      await this.logScanAttempt({
        client_id, event_id, ticket_id: ticket.id, scan_result: 'duplicate',
        rejection_reason: `QR nonce already used at ${usedNonce.used_at}`,
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });
      return {
        result: 'duplicate',
        message: 'This QR code has already been scanned',
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        checked_in_at: usedNonce.used_at,
      };
    }

    // 7. Process check-in or check-out
    const now = new Date().toISOString();

    if (scan_type === 'check_in') {
      if (ticket.checked_in_at) {
        return {
          result: 'already_checked_in',
          message: 'Attendee already checked in',
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          checked_in_at: ticket.checked_in_at,
        };
      }

      // Perform check-in
      const { error: checkinError } = await supabaseAdmin
        .from('check_ins')
        .insert({
          client_id,
          event_id,
          registration_id: ticket.registration_id,
          ticket_id: ticket.id,
          staff_id: staff_id || null,
          station_id: station_id || null,
          scan_type: 'check_in',
          scanned_at: now,
          qr_data: qr_string,
          ip_address: ip_address || null,
          device_id: device_id || null,
        });

      if (checkinError) {
        if (checkinError.code === '23505') {
          // Unique constraint violation — already checked in
          return {
            result: 'already_checked_in',
            message: 'Attendee already checked in',
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number,
          };
        }
        console.error('Check-in error:', checkinError);
        return { result: 'invalid', message: 'Failed to process check-in' };
      }

      // Update ticket status
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'used', checked_in_at: now, checked_in_by: staff_id || null, check_in_station_id: station_id || null })
        .eq('id', ticket.id);

      // Mark nonce as used
      if (usedNonce) {
        await supabaseAdmin
          .from('qr_nonces')
          .update({ used_at: now, used_by_station: station_id || null })
          .eq('id', usedNonce.id);
      } else {
        await supabaseAdmin
          .from('qr_nonces')
          .update({ used_at: now, used_by_station: station_id || null })
          .eq('ticket_id', ticket.id)
          .eq('nonce', payload.n);
      }

      // Get attendee info
      const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('first_name, last_name, email')
        .eq('id', ticket.registration_id)
        .single();

      await this.logScanAttempt({
        client_id, event_id, ticket_id: ticket.id, scan_result: 'success',
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });

      return {
        result: 'success',
        message: 'Check-in successful',
        ticket_id: ticket.id,
        registration_id: ticket.registration_id,
        attendee_name: reg ? `${reg.first_name} ${reg.last_name}` : 'Unknown',
        attendee_email: reg?.email,
        ticket_number: ticket.ticket_number,
        checked_in_at: now,
      };
    } else {
      // Check-out
      if (!ticket.checked_in_at) {
        return { result: 'invalid', message: 'Cannot check out — not checked in yet' };
      }
      if (ticket.checked_out_at) {
        return {
          result: 'duplicate',
          message: 'Already checked out',
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          checked_in_at: ticket.checked_in_at,
        };
      }

      // Find the check-in record
      const { data: checkin } = await supabaseAdmin
        .from('check_ins')
        .select('id')
        .eq('ticket_id', ticket.id)
        .eq('event_id', event_id)
        .eq('scan_type', 'check_in')
        .order('scanned_at', { ascending: false })
        .limit(1)
        .single();

      if (!checkin) {
        return { result: 'invalid', message: 'Check-in record not found' };
      }

      const durationMinutes = Math.round(
        (Date.now() - new Date(ticket.checked_in_at).getTime()) / 60000
      );

      const { error: checkoutError } = await supabaseAdmin
        .from('check_outs')
        .insert({
          client_id,
          event_id,
          check_in_id: checkin.id,
          registration_id: ticket.registration_id,
          ticket_id: ticket.id,
          staff_id: staff_id || null,
          station_id: station_id || null,
          scanned_at: now,
          duration_minutes: durationMinutes,
          ip_address: ip_address || null,
          device_id: device_id || null,
        });

      if (checkoutError) {
        console.error('Check-out error:', checkoutError);
        return { result: 'invalid', message: 'Failed to process check-out' };
      }

      await supabaseAdmin
        .from('tickets')
        .update({ checked_out_at: now })
        .eq('id', ticket.id);

      // Mark nonce as used
      if (usedNonce) {
        await supabaseAdmin
          .from('qr_nonces')
          .update({ used_at: now, used_by_station: station_id || null })
          .eq('id', usedNonce.id);
      }

      const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('first_name, last_name, email')
        .eq('id', ticket.registration_id)
        .single();

      await this.logScanAttempt({
        client_id, event_id, ticket_id: ticket.id, scan_result: 'success',
        ip_address, device_id, station_id, staff_id, nonce: payload.n,
        qr_payload: payload,
      });

      return {
        result: 'success',
        message: 'Check-out successful',
        ticket_id: ticket.id,
        registration_id: ticket.registration_id,
        attendee_name: reg ? `${reg.first_name} ${reg.last_name}` : 'Unknown',
        attendee_email: reg?.email,
        ticket_number: ticket.ticket_number,
        checked_in_at: ticket.checked_in_at,
      };
    }
  }

  /**
   * Log every scan attempt for audit
   */
  private async logScanAttempt(params: {
    client_id: string;
    event_id: string;
    ticket_id?: string;
    scan_result: string;
    rejection_reason?: string;
    ip_address?: string;
    device_id?: string;
    station_id?: string;
    staff_id?: string;
    nonce?: string;
    qr_payload?: unknown;
  }) {
    await supabaseAdmin
      .from('qr_scan_attempts')
      .insert({
        client_id: params.client_id,
        event_id: params.event_id,
        ticket_id: params.ticket_id || null,
        nonce: params.nonce || null,
        station_id: params.station_id || null,
        staff_id: params.staff_id || null,
        scan_result: params.scan_result,
        ip_address: params.ip_address || null,
        device_id: params.device_id || null,
        rejection_reason: params.rejection_reason || null,
        qr_payload: params.qr_payload || null,
      })
      .catch(err => console.error('Failed to log scan attempt:', err));
  }

  /**
   * Get scan history for an event
   */
  async getScanHistory(clientId: string, eventId: string, limit = 50) {
    const { data, error } = await supabaseAdmin
      .from('qr_scan_attempts')
      .select(`
        id, scan_result, scanned_at, rejection_reason, device_id,
        ticket:tickets(ticket_number),
        staff:users(first_name, last_name),
        station:check_in_stations(name)
      `)
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Get fraud summary for an event
   */
  async getFraudSummary(clientId: string, eventId: string) {
    const { data, error } = await supabaseAdmin
      .from('qr_scan_attempts')
      .select('scan_result')
      .eq('client_id', clientId)
      .eq('event_id', eventId);

    if (error) throw error;

    const attempts = data || [];
    return {
      total: attempts.length,
      success: attempts.filter(a => a.scan_result === 'success').length,
      duplicate: attempts.filter(a => a.scan_result === 'duplicate').length,
      expired: attempts.filter(a => a.scan_result === 'expired').length,
      invalid: attempts.filter(a => a.scan_result === 'invalid').length,
      fraud_suspected: attempts.filter(a => a.scan_result === 'fraud_suspected').length,
    };
  }
}

export const scanValidation = new ScanValidationService();

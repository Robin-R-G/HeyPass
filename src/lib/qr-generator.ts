import { supabaseAdmin } from '@/lib/supabase/client';
import QRCode from 'qrcode';
import {
  createQRPayload,
  encodeQRString,
  verifyQRPayload,
  decodeQRString,
  getQRExpiryMinutes,
  type QRPayload,
} from './qr-crypto';

export interface SecureQRData {
  qr_data_url: string;
  qr_string: string;
  payload: QRPayload;
  expires_at: string;
  ticket_id: string;
  version: number;
}

export class QRGeneratorService {
  /**
   * Generate a new signed QR code for a ticket.
   * Deactivates any previous active QR nonces.
   */
  async generate(clientId: string, ticketId: string): Promise<SecureQRData | null> {
    // Fetch ticket (verify ownership)
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, event_id, client_id, ticket_number, qr_version, status')
      .eq('id', ticketId)
      .eq('client_id', clientId)
      .single();

    if (!ticket) return null;

    if (ticket.status === 'cancelled') {
      throw new Error('Cannot generate QR for cancelled ticket');
    }

    // Create signed payload
    const payload = createQRPayload(ticket.id);
    const qrString = encodeQRString(payload);
    const expiresAt = new Date(payload.exp * 1000).toISOString();

    // Store nonce in DB for server-side verification
    const { error: nonceError } = await supabaseAdmin
      .from('qr_nonces')
      .insert({
        ticket_id: ticket.id,
        nonce: payload.n,
        hmac_signature: payload.sig,
        issued_at: new Date(payload.ts * 1000).toISOString(),
        expires_at: expiresAt,
        is_active: true,
      });

    if (nonceError) {
      console.error('Failed to store QR nonce:', nonceError);
      throw new Error('Failed to generate QR code');
    }

    // Generate QR image (contains ONLY the compact signed string — no secrets)
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    // Don't store the QR image in DB — return it directly
    return {
      qr_data_url: qrDataUrl,
      qr_string: qrString,
      payload,
      expires_at: expiresAt,
      ticket_id: ticket.id,
      version: ticket.qr_version + 1,
    };
  }

  /**
   * Generate QR on-demand for display (no DB write — read-only)
   */
  async generateForDisplay(clientId: string, ticketId: string): Promise<SecureQRData | null> {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, ticket_number, qr_version, status')
      .eq('id', ticketId)
      .eq('client_id', clientId)
      .single();

    if (!ticket) return null;

    // Check if there's an active nonce we can reuse
    const { data: activeNonce } = await supabaseAdmin
      .from('qr_nonces')
      .select('nonce, hmac_signature, issued_at, expires_at')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let payload: QRPayload;

    if (activeNonce) {
      // Reuse existing valid nonce
      payload = {
        v: 1,
        tid: ticketId.slice(0, 8),
        n: activeNonce.nonce,
        ts: Math.floor(new Date(activeNonce.issued_at).getTime() / 1000),
        exp: Math.floor(new Date(activeNonce.expires_at).getTime() / 1000),
        sig: activeNonce.hmac_signature,
      };
    } else {
      // Generate fresh
      payload = createQRPayload(ticketId);
    }

    const qrString = encodeQRString(payload);

    const qrDataUrl = await QRCode.toDataURL(qrString, {
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    return {
      qr_data_url: qrDataUrl,
      qr_string: qrString,
      payload,
      expires_at: new Date(payload.exp * 1000).toISOString(),
      ticket_id: ticket.id,
      version: ticket.qr_version,
    };
  }

  /**
   * Rotate QR for a ticket (invalidates old, creates new)
   */
  async rotate(clientId: string, ticketId: string): Promise<SecureQRData | null> {
    return this.generate(clientId, ticketId);
  }

  /**
   * Get QR status for a ticket
   */
  async getStatus(ticketId: string) {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, qr_version, qr_last_rotated_at, qr_rotation_count, status')
      .eq('id', ticketId)
      .single();

    if (!ticket) return null;

    const { data: activeNonce } = await supabaseAdmin
      .from('qr_nonces')
      .select('expires_at, created_at')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { count: totalScans } = await supabaseAdmin
      .from('qr_scan_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticketId);

    return {
      qr_version: ticket.qr_version,
      last_rotated_at: ticket.qr_last_rotated_at,
      rotation_count: ticket.qr_rotation_count,
      has_active_qr: !!activeNonce,
      qr_expires_at: activeNonce?.expires_at || null,
      total_scans: totalScans || 0,
      status: ticket.status,
    };
  }
}

export const qrGenerator = new QRGeneratorService();

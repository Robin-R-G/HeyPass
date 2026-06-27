import crypto from 'crypto';

const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET || process.env.JWT_SECRET;
const QR_EXPIRY_MINUTES = parseInt(process.env.QR_EXPIRY_MINUTES || '480'); // 8 hours default

if (!QR_HMAC_SECRET || QR_HMAC_SECRET.length < 32) {
  throw new Error('QR_HMAC_SECRET or JWT_SECRET must be at least 32 characters');
}

export interface QRPayload {
  v: number;        // version
  tid: string;      // ticket_id (short prefix)
  n: string;        // nonce
  ts: number;       // issued_at (unix seconds)
  exp: number;      // expires_at (unix seconds)
  sig: string;      // HMAC-SHA256 signature
}

export interface QRVerifyResult {
  valid: boolean;
  ticket_id_prefix?: string;
  nonce?: string;
  reason?: string;
}

/**
 * Generate HMAC-SHA256 signature for QR payload
 */
function signPayload(data: string): string {
  return crypto
    .createHmac('sha256', QR_HMAC_SECRET!)
    .update(data)
    .digest('hex')
    .slice(0, 32); // 32 chars = 128 bits
}

/**
 * Create a signed QR payload for a ticket
 */
export function createQRPayload(ticketId: string): QRPayload {
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const expires = now + QR_EXPIRY_MINUTES * 60;

  // Sign: version + ticket_id + nonce + timestamp + expiry
  const signInput = `1:${ticketId}:${nonce}:${now}:${expires}`;
  const sig = signPayload(signInput);

  return {
    v: 1,
    tid: ticketId.slice(0, 8), // First 8 chars only — full ID stays server-side
    n: nonce,
    ts: now,
    exp: expires,
    sig,
  };
}

/**
 * Verify a QR payload
 */
export function verifyQRPayload(payload: QRPayload): QRVerifyResult {
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { valid: false, reason: 'QR code has expired' };
  }

  // Verify signature
  const signInput = `${payload.v}:${payload.tid}:${payload.n}:${payload.ts}:${payload.exp}`;
  const expectedSig = signPayload(signInput);

  if (payload.sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(payload.sig), Buffer.from(expectedSig))) {
    return { valid: false, reason: 'Invalid QR signature — possible tampering' };
  }

  // Check version
  if (payload.v !== 1) {
    return { valid: false, reason: 'Unsupported QR version' };
  }

  return {
    valid: true,
    ticket_id_prefix: payload.tid,
    nonce: payload.n,
  };
}

/**
 * Encode QR payload to compact string for QR code
 */
export function encodeQRString(payload: QRPayload): string {
  // Compact: v.tid.n.ts.exp.sig
  return `${payload.v}.${payload.tid}.${payload.n}.${payload.ts}.${payload.exp}.${payload.sig}`;
}

/**
 * Decode compact QR string back to payload
 */
export function decodeQRString(qr: string): QRPayload | null {
  const parts = qr.split('.');
  if (parts.length !== 6) return null;

  const [v, tid, n, ts, exp, sig] = parts;

  return {
    v: parseInt(v),
    tid,
    n,
    ts: parseInt(ts),
    exp: parseInt(exp),
    sig,
  };
}

/**
 * Get QR expiry window in minutes
 */
export function getQRExpiryMinutes(): number {
  return QR_EXPIRY_MINUTES;
}

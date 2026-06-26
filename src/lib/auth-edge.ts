import type { JWTPayload } from '@/types';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET not configured');
  }
  return secret;
}

function padB64(str: string): string {
  const pad = (4 - (str.length % 4)) % 4;
  return str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
}

export async function verifyAccessTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJWTSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const headerStr = atob(padB64(headerB64));
    const header = JSON.parse(headerStr) as { alg?: string };
    if (header.alg !== 'HS256') return null;

    const payloadStr = atob(padB64(payloadB64));
    const payload = JSON.parse(payloadStr) as JWTPayload;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const binarySign = atob(padB64(signatureB64));
    const signBytes = new Uint8Array(binarySign.length);
    for (let i = 0; i < binarySign.length; i++) {
      signBytes[i] = binarySign.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signBytes, data);
    if (!isValid) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

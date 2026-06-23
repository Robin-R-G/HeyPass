import jwt from 'jsonwebtoken';
import type { JWTPayload } from '@/types';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'Application cannot start without a secure JWT secret. ' +
      'Run: openssl rand -base64 32'
    );
  }
  if (secret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be at least 32 characters. ' +
      'Run: openssl rand -base64 32'
    );
  }
  return secret;
}

const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(userId: string, jti?: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: jti || crypto.randomUUID() },
    getJWTSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJWTSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyAccessTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJWTSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const padB64 = (str: string) => {
      const pad = (4 - (str.length % 4)) % 4;
      return str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
    };

    // Decode payload
    const payloadStr = atob(padB64(payloadB64));
    const payload = JSON.parse(payloadStr) as JWTPayload;

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url signature to Uint8Array
    const binarySign = atob(padB64(signatureB64));
    const signBytes = new Uint8Array(binarySign.length);
    for (let i = 0; i < binarySign.length; i++) {
      signBytes[i] = binarySign.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signBytes,
      data
    );

    if (!isValid) return null;

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}


export function verifyRefreshToken(token: string): { sub: string; jti: string } | null {
  try {
    const payload = jwt.verify(token, getJWTSecret()) as {
      sub: string;
      type: string;
      jti: string;
    };
    if (payload.type !== 'refresh') return null;
    if (!payload.jti) return null;
    return { sub: payload.sub, jti: payload.jti };
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (!token || token.length === 0) return null;
  return token;
}

export function extractClientFromHeader(req: Request): string | null {
  return req.headers.get('x-client-id') || null;
}

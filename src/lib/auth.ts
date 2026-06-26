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

function getJWTRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_REFRESH_SECRET environment variable is not set. ' +
      'Run: openssl rand -base64 32'
    );
  }
  if (secret.length < 32) {
    throw new Error(
      'FATAL: JWT_REFRESH_SECRET must be at least 32 characters. ' +
      'Run: openssl rand -base64 32'
    );
  }
  return secret;
}

const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJWTSecret(), { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(userId: string, jti?: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: jti || crypto.randomUUID() },
    getJWTRefreshSecret(),
    { algorithm: 'HS256', expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJWTSecret(), { algorithms: ['HS256'] }) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } | null {
  try {
    const payload = jwt.verify(token, getJWTRefreshSecret(), { algorithms: ['HS256'] }) as {
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

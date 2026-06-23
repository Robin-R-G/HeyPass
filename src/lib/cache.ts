import Redis from 'ioredis';

let redis: Redis | null = null;
let redisAvailable = false;

function getRedisClient(): Redis | null {
  if (!redisAvailable) return null;
  return redis;
}

function initRedis(): void {
  if (redis) return;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[Redis] REDIS_URL not set. Running without cache/session store.');
    return;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 100, 500);
      },
      connectTimeout: 2000,
      commandTimeout: 2000,
      lazyConnect: true,
      keyPrefix: 'heypass:',
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      redisAvailable = false;
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected');
      redisAvailable = true;
    });

    // Try to connect in background — don't block the request
    redis.connect().catch(() => {
      console.warn('[Redis] Could not connect. Running without cache.');
      redisAvailable = false;
    });
  } catch {
    console.warn('[Redis] Init failed. Running without cache.');
    redisAvailable = false;
  }
}

// Initialize Redis on module load (background, non-blocking)
initRedis();

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;
    const data = await client.get(key);

    if (!data) return null;

    // Try to decrypt if it looks like encrypted data
    try {
      const decrypted = await decryptData(data);
      return JSON.parse(decrypted);
    } catch {
      // If decryption fails, try parsing as JSON directly (backward compatible)
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[Cache] Get error for key ${key}:`, err);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    const jsonValue = JSON.stringify(value);

    // Encrypt sensitive data (session data, PII)
    const encrypted = await encryptData(jsonValue);

    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, encrypted);
    } else {
      await client.set(key, encrypted);
    }
  } catch (err) {
    console.error(`[Cache] Set error for key ${key}:`, err);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.del(key);
  } catch (err) {
    console.error(`[Cache] Delete error for key ${key}:`, err);
  }
}

export async function cacheIncrement(key: string): Promise<number> {
  try {
    const client = getRedisClient();
    if (!client) return 0;
    return await client.incr(key);
  } catch (err) {
    console.error(`[Cache] Increment error for key ${key}:`, err);
    return 0;
  }
}

export async function cacheSetWithExpire(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    const encrypted = await encryptData(JSON.stringify(value));
    await client.setex(key, ttlSeconds, encrypted);
  } catch (err) {
    console.error(`[Cache] SetWithExpire error for key ${key}:`, err);
  }
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const client = getRedisClient();
    if (!client) return { allowed: true, remaining: maxAttempts, retryAfter: undefined };
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const fullKey = `ratelimit:${key}`;

    // Remove old entries outside the window
    await client.zremrangebyscore(fullKey, 0, windowStart);

    // Count current requests in window
    const count = await client.zcard(fullKey);

    if (count >= maxAttempts) {
      // Get oldest entry to calculate retry after
      const oldest = await client.zrange(fullKey, 0, 0, 'WITHSCORES');
      const retryAfter = oldest.length > 1
        ? Math.ceil((parseInt(oldest[1]) + windowSeconds * 1000 - now) / 1000)
        : windowSeconds;

      return { allowed: false, remaining: 0, retryAfter };
    }

    // Add current request to the window
    await client.zadd(fullKey, now.toString(), `${now}-${Math.random()}`);
    await client.expire(fullKey, windowSeconds);

    return { allowed: true, remaining: maxAttempts - count - 1 };
  } catch (err) {
    console.error(`[Cache] Rate limit error for key ${key}:`, err);
    // Fail open: allow request if Redis is down (better UX than blocking everyone)
    return { allowed: true, remaining: maxAttempts, retryAfter: undefined };
  }
}

// ============================================================
// ENCRYPTION FOR PII IN REDIS
// ============================================================

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = process.env.REDIS_ENCRYPTION_KEY;

  if (!rawKey) {
    // Use a derived key from JWT_SECRET as fallback (not ideal but secure enough for MVP)
    const jwtSecret = process.env.JWT_SECRET || '';
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(jwtSecret.slice(0, 32).padEnd(32, '0')),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('heypass-redis-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(rawKey),
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();

    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(data)
    );

    // Combine IV + encrypted data and base64 encode
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('[Cache] Encryption error:', err);
    // Throw instead of falling back to plaintext
    throw new Error('Encryption failed — refusing to store PII in plaintext');
  }
}

async function decryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(data).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // If decryption fails, the data might be unencrypted (backward compatibility)
    return data;
  }
}

export async function cacheHealthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

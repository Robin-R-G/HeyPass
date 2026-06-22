import { supabaseAdmin } from '@/lib/supabase/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { cacheGet, cacheSet, cacheDelete, checkRateLimit } from '@/lib/cache';
import crypto from 'crypto';
import type { JWTPayload } from '@/types';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  last_login_at: string | null;
}

export interface AuthContext {
  user: AuthUser;
  clientId: string | null;
  roleSlug: string | null;
}

export interface LoginParams {
  email: string;
  password: string;
  ip_address?: string;
  user_agent?: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ============================================================
// PASSWORD VALIDATION
// ============================================================
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (/[<>{}|\\^~\[\]`]/.test(password)) {
    return { valid: false, error: 'Password contains invalid characters' };
  }
  return { valid: true };
}

// ============================================================
// LOGIN
// ============================================================
export async function authenticateUser(params: LoginParams): Promise<{
  user: AuthUser;
  tokens: AuthTokens;
}> {
  const { email, password, ip_address, user_agent } = params;

  // Rate limit: 5 attempts per minute per email
  const rateLimitKey = `auth:login:${email}`;
  const { allowed } = await checkRateLimit(rateLimitKey, 5, 60);

  if (!allowed) {
    throw new Error('Too many login attempts. Please try again in 1 minute.');
  }

  // IP-based rate limit: 20 attempts per minute per IP
  if (ip_address) {
    const ipRateLimitKey = `auth:login:ip:${ip_address}`;
    const { allowed: ipAllowed } = await checkRateLimit(ipRateLimitKey, 20, 60);
    if (!ipAllowed) {
      throw new Error('Too many login attempts from this IP. Please try again later.');
    }
  }

  // Check account lockout
  const lockoutKey = `auth:lockout:${email}`;
  const lockoutCount = await cacheGet<number>(lockoutKey);

  if (lockoutCount && lockoutCount >= 5) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    // Increment lockout counter
    const newCount = (lockoutCount || 0) + 1;
    await cacheSet(lockoutKey, newCount, 3600); // 1 hour TTL

    await createAuditLog({
      action: 'auth.failed_login',
      resource_type: 'user',
      ip_address,
      user_agent,
      new_value: { email, reason: 'invalid_credentials' },
    });

    throw new Error('Invalid email or password');
  }

  // Clear lockout on successful login
  await cacheDelete(lockoutKey);

  // Fetch user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  // Check if user is locked out
  if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  // Update last login
  await supabaseAdmin
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      failed_login_attempts: 0,
    })
    .eq('id', authData.user.id);

  // Generate tokens with refresh token stored in Redis
  const tokens = await generateAndStoreTokens(authData.user.id, email, null, null, ip_address, user_agent);

  // Audit log
  await createAuditLog({
    user_id: authData.user.id,
    action: 'auth.login',
    resource_type: 'user',
    resource_id: authData.user.id,
    ip_address,
    user_agent,
  });

  const user: AuthUser = {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    email_verified_at: profile.email_verified_at,
    last_login_at: profile.last_login_at,
  };

  return { user, tokens };
}

// ============================================================
// CLIENT-SCOPED LOGIN
// ============================================================
export async function authenticateWithClient(
  userId: string,
  clientId: string,
  ip_address?: string,
  user_agent?: string
): Promise<{ tokens: AuthTokens; role: string }> {
  // Verify user is member of client
  const { data: membership, error } = await supabaseAdmin
    .from('client_memberships')
    .select(`
      id,
      role:roles(slug, name)
    `)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single();

  if (error || !membership) {
    throw new Error('Access denied: Not a member of this client');
  }

  const role = (membership.role as { slug: string }).slug;

  // Fetch user email
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Invalidate old refresh token and generate new one
  await invalidateRefreshToken(userId);

  const tokens = await generateAndStoreTokens(userId, user.email, clientId, role, ip_address, user_agent);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'auth.login',
    resource_type: 'user',
    resource_id: userId,
    new_value: { client_id: clientId, role },
    ip_address,
    user_agent,
  });

  return { tokens, role };
}

// ============================================================
// REFRESH TOKEN (with rotation)
// ============================================================
export async function refreshAccessToken(
  refreshToken: string,
  ip_address?: string,
  user_agent?: string
): Promise<{ tokens: AuthTokens }> {
  const payload = verifyRefreshToken(refreshToken);

  if (!payload) {
    throw new Error('Invalid or expired refresh token');
  }

  // Check if refresh token exists in Redis
  const storedData = await cacheGet<{ jti: string; ip: string | null }>(`refresh:${payload.sub}`);

  if (!storedData) {
    // No refresh token stored — possible stolen token used after logout
    await createAuditLog({
      user_id: payload.sub,
      action: 'auth.failed_login',
      resource_type: 'user',
      resource_id: payload.sub,
      new_value: { reason: 'refresh_token_not_found', ip: ip_address },
      ip_address,
      user_agent,
    });
    throw new Error('Invalid refresh token: session expired');
  }

  // Verify the presented token matches the stored one (rotation check)
  if (storedData.jti !== payload.jti) {
    // Token reuse detected — possible session hijack
    await createAuditLog({
      user_id: payload.sub,
      action: 'auth.session_compromised',
      resource_type: 'user',
      resource_id: payload.sub,
      new_value: { reason: 'refresh_token_reuse', ip: ip_address },
      ip_address,
      user_agent,
    });

    // Invalidate ALL sessions for this user
    await invalidateAllSessions(payload.sub);

    throw new Error('Invalid refresh token: possible session compromise. All sessions invalidated.');
  }

  // Fetch user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', payload.sub)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch current membership
  const { data: membership } = await supabaseAdmin
    .from('client_memberships')
    .select(`
      client_id,
      role:roles(slug)
    `)
    .eq('user_id', payload.sub)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const clientId = membership?.client_id || null;
  const roleSlug = membership?.role ? (membership.role as { slug: string }).slug : null;

  // ROTATION: Invalidate old refresh token before generating new one
  await invalidateRefreshToken(payload.sub);

  // Generate new tokens (old refresh token is now invalid)
  const tokens = await generateAndStoreTokens(
    payload.sub,
    user.email,
    clientId,
    roleSlug,
    ip_address,
    user_agent
  );

  return { tokens };
}

// ============================================================
// REGISTER
// ============================================================
export async function registerUser(params: RegisterParams): Promise<{
  user: AuthUser;
  tokens: AuthTokens;
}> {
  const { email, password, first_name, last_name } = params;

  // Validate password complexity
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.error!);
  }

  // Rate limit: 3 registrations per hour per email
  const emailRateLimitKey = `auth:register:${email}`;
  const { allowed: emailAllowed } = await checkRateLimit(emailRateLimitKey, 3, 3600);
  if (!emailAllowed) {
    throw new Error('Too many registration attempts. Please try again later.');
  }

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Create user profile
  const { error: profileError } = await supabaseAdmin.from('users').insert({
    id: authData.user.id,
    email,
    first_name: first_name || null,
    last_name: last_name || null,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error('Failed to create user profile');
  }

  // Generate tokens
  const tokens = await generateAndStoreTokens(authData.user.id, email, null, null);

  await createAuditLog({
    user_id: authData.user.id,
    action: 'auth.register',
    resource_type: 'user',
    resource_id: authData.user.id,
    new_value: { email, first_name, last_name },
  });

  const user: AuthUser = {
    id: authData.user.id,
    email,
    first_name: first_name || null,
    last_name: last_name || null,
    phone: null,
    avatar_url: null,
    email_verified_at: new Date().toISOString(),
    last_login_at: null,
  };

  return { user, tokens };
}

// ============================================================
// LOGOUT
// ============================================================
export async function logoutUser(
  userId: string,
  clientId?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  // Invalidate all sessions and refresh tokens
  await invalidateAllSessions(userId);

  await createAuditLog({
    user_id: userId,
    client_id: clientId || undefined,
    action: 'auth.logout',
    resource_type: 'user',
    resource_id: userId,
    ip_address,
    user_agent,
  });
}

// ============================================================
// GET SESSION
// ============================================================
export async function getSession(accessToken: string): Promise<AuthContext | null> {
  try {
    const { verifyAccessToken } = await import('@/lib/auth');
    const payload = verifyAccessToken(accessToken);

    if (!payload) {
      return null;
    }

    // Check if session is revoked (token in blacklist)
    const isBlacklisted = await cacheGet<boolean>(`token:blacklist:${accessToken}`);
    if (isBlacklisted) {
      return null;
    }

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        email_verified_at: user.email_verified_at,
        last_login_at: user.last_login_at,
      },
      clientId: payload.client_id,
      roleSlug: payload.role,
    };
  } catch {
    return null;
  }
}

// ============================================================
// PASSWORD RESET
// ============================================================
export async function requestPasswordReset(
  email: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  // Rate limit: 3 requests per hour per email
  const rateLimitKey = `auth:reset:${email}`;
  const { allowed } = await checkRateLimit(rateLimitKey, 3, 3600);

  if (!allowed) {
    return; // Don't reveal rate limit
  }

  // Fetch user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();

  if (!user) {
    return; // Don't reveal if user exists
  }

  // Generate reset token
  const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const resetTokenHash = await hashToken(resetToken);

  // Store reset token in Redis (1 hour expiry)
  await cacheSet(`password_reset:${user.id}`, resetTokenHash, 3600);

  // Send reset email with token in POST body, not URL
  const { sendEmail } = await import('@/lib/email');
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your HeyPass account.</p>
      <p>Your reset code: <strong>${resetToken.slice(0, 8).toUpperCase()}</strong></p>
      <p>This code expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });

  await createAuditLog({
    user_id: user.id,
    action: 'auth.password_reset_request',
    resource_type: 'user',
    resource_id: user.id,
    new_value: { action: 'password_reset_requested' },
    ip_address,
    user_agent,
  });
}

// ============================================================
// RESET PASSWORD
// ============================================================
export async function resetPassword(
  userId: string,
  token: string,
  newPassword: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  // Validate new password
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.error!);
  }

  // Get stored token hash
  const storedHash = await cacheGet<string>(`password_reset:${userId}`);

  if (!storedHash) {
    throw new Error('Reset token expired or not found');
  }

  // Verify token
  const tokenHash = await hashToken(token);

  if (Buffer.byteLength(tokenHash) !== Buffer.byteLength(storedHash) ||
      !crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(storedHash))) {
    throw new Error('Invalid reset token');
  }

  // Update password via Supabase Admin
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error('Failed to update password');
  }

  // Invalidate reset token
  await cacheDelete(`password_reset:${userId}`);

  // Invalidate ALL sessions and refresh tokens
  await invalidateAllSessions(userId);

  await createAuditLog({
    user_id: userId,
    action: 'auth.password_reset_complete',
    resource_type: 'user',
    resource_id: userId,
    new_value: { action: 'password_reset_completed' },
    ip_address,
    user_agent,
  });

  // Send confirmation email
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (user) {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: user.email,
      subject: 'Password Changed',
      html: `
        <h1>Password Changed</h1>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, contact support immediately.</p>
      `,
    });
  }
}

// ============================================================
// HELPERS
// ============================================================

async function generateAndStoreTokens(
  userId: string,
  email: string,
  clientId: string | null,
  role: string | null,
  ip_address?: string,
  user_agent?: string
): Promise<AuthTokens> {
  const refreshToken = signRefreshToken(userId);

  // Decode refresh token to get jti
  const decoded = JSON.parse(
    Buffer.from(refreshToken.split('.')[1], 'base64url').toString()
  );

  // Store refresh token metadata in Redis (7 days)
  await cacheSet(`refresh:${userId}`, {
    jti: decoded.jti,
    ip: ip_address || null,
    user_agent: user_agent ? user_agent.slice(0, 200) : null,
    created_at: new Date().toISOString(),
  }, 604800); // 7 days

  const accessToken = signAccessToken({
    sub: userId,
    email,
    client_id: clientId,
    role,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900,
  };
}

async function invalidateRefreshToken(userId: string): Promise<void> {
  await cacheDelete(`refresh:${userId}`);
}

async function invalidateAllSessions(userId: string): Promise<void> {
  await cacheDelete(`refresh:${userId}`);
  await cacheDelete(`session:${userId}`);
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

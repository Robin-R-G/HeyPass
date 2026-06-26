import { supabaseAdmin } from '@/lib/supabase/client';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth';
import { cacheGet, cacheSet } from '@/lib/cache';
import type { NextRequest } from 'next/server';
import { createAuditLog } from '@/lib/audit';
import { extractClientIP } from '@/lib/auth-service';

// ============================================================
// PERMISSION CONSTANTS
// ============================================================

export const PERMISSIONS = {
  // Client
  CLIENT_VIEW: 'client.view',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',

  // Users
  USERS_VIEW: 'users.view',
  USERS_INVITE: 'users.invite',
  USERS_EDIT: 'users.edit',
  USERS_REMOVE: 'users.remove',
  USER_ROLE_ASSIGN: 'user.role_assign',
  USER_IMPERSONATE: 'user.impersonate',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',

  // Events
  EVENTS_VIEW: 'events.view',
  EVENTS_CREATE: 'events.create',
  EVENTS_EDIT: 'events.edit',
  EVENTS_DELETE: 'events.delete',
  EVENTS_PUBLISH: 'events.publish',
  EVENTS_CLOSE: 'events.close',
  EVENTS_CLONE: 'events.clone',
  EVENT_MANAGE_STAFF: 'event.manage_staff',
  EVENT_CONFIGURE_BRANDING: 'event.configure_branding',

  // Sessions
  SESSIONS_VIEW: 'sessions.view',
  SESSIONS_CREATE: 'sessions.create',
  SESSIONS_EDIT: 'sessions.edit',
  SESSIONS_DELETE: 'sessions.delete',

  // Registrations
  REGISTRATIONS_VIEW: 'registrations.view',
  REGISTRATIONS_CREATE: 'registrations.create',
  REGISTRATIONS_EDIT: 'registrations.edit',
  REGISTRATIONS_DELETE: 'registrations.delete',
  REGISTRATIONS_EXPORT: 'registrations.export',
  REGISTRATION_APPROVE: 'registration.approve',
  REGISTRATION_REFUND: 'registration.refund',
  REGISTRATION_CANCEL: 'registration.cancel',
  REGISTRATION_WAITLIST_VIEW: 'registration.waitlist_view',
  REGISTRATION_WAITLIST_PROMOTE: 'registration.waitlist_promote',

  // Coupons
  COUPON_CREATE: 'coupon.create',
  COUPON_VIEW: 'coupon.view',
  COUPON_DELETE: 'coupon.delete',

  // Tickets
  TICKETS_VIEW: 'tickets.view',
  TICKETS_VALIDATE: 'tickets.validate',
  TICKETS_TRANSFER: 'tickets.transfer',
  TICKET_SCAN: 'ticket.scan',
  TICKET_CHECKOUT: 'ticket.checkout',
  TICKET_OVERRIDE: 'ticket.override',

  // Check-in
  CHECKIN_PERFORM: 'checkin.perform',
  CHECKIN_VIEW: 'checkin.view',
  CHECKIN_OVERRIDE: 'checkin.override',
  CHECKIN_EXPORT: 'checkin.export',
  CHECKIN_OFFLINE_UPLOAD: 'checkin.offline_upload',

  // Check-out
  CHECKOUT_PERFORM: 'checkout.perform',
  CHECKOUT_VIEW: 'checkout.view',
  CHECKOUT_MANUAL: 'checkout.manual',
  CHECKOUT_EXPORT: 'checkout.export',
  CHECKOUT_AUTO_CONFIGURE: 'checkout.auto_configure',

  // Attendance
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_EXPORT: 'attendance.export',

  // Certificates
  CERTIFICATES_VIEW: 'certificates.view',
  CERTIFICATES_GENERATE: 'certificates.generate',
  CERTIFICATES_DOWNLOAD: 'certificates.download',
  CERTIFICATES_REVOKE: 'certificates.revoke',
  CERTIFICATES_TEMPLATES: 'certificates.templates',
  CERTIFICATE_REGENERATE: 'certificate.regenerate',
  CERTIFICATE_EXPORT: 'certificate.export',
  CERTIFICATE_VERIFY: 'certificate.verify',
  CERTIFICATE_UPLOAD_ASSETS: 'certificate.upload_assets',
  CERTIFICATE_CONFIGURE_DEFAULTS: 'certificate.configure_defaults',

  // Verification
  VERIFICATION_CONFIGURE: 'verification.configure',
  VERIFICATION_LOGS_VIEW: 'verification.logs_view',

  // Theme
  THEME_VIEW: 'theme.view',
  THEME_EDIT: 'theme.edit',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  BILLING_INVOICE_DOWNLOAD: 'billing.invoice_download',
  BILLING_PLAN_VIEW: 'billing.plan_view',
  BILLING_PLAN_CHANGE: 'billing.plan_change',
  BILLING_CANCEL: 'billing.cancel',

  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // API Keys
  APIKEY_VIEW: 'apikey.view',
  APIKEY_CREATE: 'apikey.create',
  APIKEY_REVOKE: 'apikey.revoke',

  // Webhooks
  WEBHOOK_VIEW: 'webhook.view',
  WEBHOOK_MANAGE: 'webhook.manage',

  // Data
  DATA_EXPORT: 'data.export',

  // Email
  EMAIL_TEMPLATE_VIEW: 'email.template_view',
  EMAIL_TEMPLATE_MANAGE: 'email.template_manage',

  // Branding
  BRANDING_UPDATE: 'branding.update',

  // Volunteer
  VOLUNTEER_VIEW: 'volunteer.view',
  VOLUNTEER_MANAGE: 'volunteer.manage',
  VOLUNTEER_TASKS_MANAGE: 'volunteer.tasks_manage',
  VOLUNTEER_COMMUNICATE: 'volunteer.communicate',

  // Food Tokens
  FOOD_TOKEN_VIEW: 'food_token.view',
  FOOD_TOKEN_MANAGE: 'food_token.manage',
  FOOD_TOKEN_GENERATE: 'food_token.generate',
  FOOD_TOKEN_VALIDATE: 'food_token.validate',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================
// PERMISSION CHECK (cached)
// ============================================================

async function getRolePermissions(roleId: string): Promise<Set<string>> {
  const cacheKey = `role_perms:${roleId}`;

  const cached = await cacheGet<string[]>(cacheKey);
  if (cached) {
    return new Set(cached);
  }

  const { data: perms } = await supabaseAdmin
    .from('role_permissions')
    .select(`
      permission:permissions(name)
    `)
    .eq('role_id', roleId);

  if (!perms) {
    return new Set();
  }

  const names = perms
    .map((p) => (p.permission as { name: string })?.name)
    .filter(Boolean);

  await cacheSet(cacheKey, names, 300); // 5 minute cache

  return new Set(names);
}

export async function checkPermission(
  userId: string,
  clientId: string | null,
  requiredPermission: PermissionName,
  is_superadmin?: boolean
): Promise<boolean> {
  // Superadmins have all permissions
  if (is_superadmin) return true;
  if (!clientId) return false;

  const cacheKey = `user_perm:${userId}:${clientId}`;
  const cached = await cacheGet<string[]>(cacheKey);
  let permissions: Set<string>;

  if (cached) {
    permissions = new Set(cached);
  } else {
    const { data: membership } = await supabaseAdmin
      .from('client_memberships')
      .select('role_id')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    if (!membership) return false;

    permissions = await getRolePermissions(membership.role_id);
    await cacheSet(cacheKey, Array.from(permissions), 300);
  }

  return permissions.has(requiredPermission);
}

// ============================================================
// MIDDLEWARE-STYLE GUARD
// ============================================================

export interface AuthPayload {
  userId: string;
  email: string;
  clientId: string | null;
  roleSlug: string | null;
  is_superadmin?: boolean;
}

export function extractAuthPayload(req: NextRequest): AuthPayload | null {
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) {
    return {
      userId: headerUserId,
      email: req.headers.get('x-user-email') || '',
      clientId: req.headers.get('x-client-id') || null,
      roleSlug: req.headers.get('x-role-slug') || null,
      is_superadmin: req.headers.get('x-is-superadmin') === 'true',
    };
  }

  const token = extractTokenFromHeader(req.headers.get('authorization') ?? undefined);
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email,
    clientId: payload.client_id || null,
    roleSlug: payload.role || null,
    is_superadmin: payload.is_superadmin || false,
  };
}

export interface GuardResult {
  allowed: boolean;
  status: number;
  error: string;
  auth: AuthPayload | null;
}

export async function requirePermission(
  req: NextRequest,
  requiredPermission: PermissionName,
  options?: { audit?: boolean }
): Promise<GuardResult> {
  const auth = extractAuthPayload(req);
  if (!auth) {
    return { allowed: false, status: 401, error: 'Unauthorized', auth: null };
  }

  if (!auth.clientId) {
    return { allowed: false, status: 403, error: 'No client context', auth };
  }

  const hasPermission = await checkPermission(auth.userId, auth.clientId, requiredPermission, auth.is_superadmin);

  if (!hasPermission) {
    if (options?.audit) {
      await createAuditLog({
        user_id: auth.userId,
        client_id: auth.clientId,
        action: 'auth.failed_login',
        resource_type: 'permission',
        new_value: { required: requiredPermission, denied: true },
        ip_address: extractClientIP(req.headers.get('x-forwarded-for')),
        user_agent: req.headers.get('user-agent') || undefined,
      });
    }
    return { allowed: false, status: 403, error: 'Forbidden', auth };
  }

  return { allowed: true, status: 200, error: '', auth };
}

// ============================================================
// ROLE-BASED SHORTCUT
// ============================================================

const ROLE_PRIORITY: Record<string, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  volunteer: 50,
  scanner: 10,
};

export function getRolePriority(roleSlug: string): number {
  return ROLE_PRIORITY[roleSlug] || 0;
}

export function hasSufficientRole(userRole: string, minimumRole: string): boolean {
  return getRolePriority(userRole) >= getRolePriority(minimumRole);
}

export function canManageRole(assignerRole: string, targetRole: string): boolean {
  return getRolePriority(assignerRole) > getRolePriority(targetRole);
}

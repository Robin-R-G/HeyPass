import { supabaseAdmin } from '@/lib/supabase/client';
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache';
import { uploadFile, deleteFile, getPublicUrl } from '@/lib/storage';
import { createAuditLog } from '@/lib/audit';

const BRANDING_CACHE_TTL = 600; // 10 minutes
const BRANDING_BUCKET = 'branding';
const EVENT_BRANDING_BUCKET = 'event-branding';

// File size limits (bytes)
const MAX_LOGO_SIZE = 2 * 1024 * 1024;       // 2MB
const MAX_FAVICON_SIZE = 512 * 1024;          // 512KB
const MAX_BANNER_SIZE = 5 * 1024 * 1024;      // 5MB

// Allowed MIME types
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const ALLOWED_FAVICON_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
const ALLOWED_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// ============================================================
// TYPES
// ============================================================

export interface ClientBranding {
  id: string;
  client_id: string;
  brand_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  college_logo_url: string | null;
  favicon_url: string | null;
  default_banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  font_family: string;
  font_heading_family: string | null;
  border_radius: number;
  white_label_enabled: boolean;
  footer_text: string | null;
  support_email: string | null;
  support_phone: string | null;
  social_links: Record<string, string>;
  email_from_name: string | null;
  email_from_address: string | null;
  email_reply_to: string | null;
  footer_company_name: string | null;
  footer_website_url: string | null;
  footer_copyright: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventBranding {
  id: string;
  event_id: string;
  client_id: string;
  banner_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  custom_css: string | null;
  custom_head_html: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedBranding {
  brand_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  college_logo_url: string | null;
  favicon_url: string | null;
  default_banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  font_family: string;
  font_heading_family: string | null;
  border_radius: number;
  white_label_enabled: boolean;
  footer_text: string | null;
  support_email: string | null;
  support_phone: string | null;
  social_links: Record<string, string>;
  email_from_name: string | null;
  email_from_address: string | null;
  email_reply_to: string | null;
  footer_company_name: string | null;
  footer_website_url: string | null;
  footer_copyright: string | null;
  custom_css: string | null;
  custom_head_html: string | null;
}

// ============================================================
// VALIDATION
// ============================================================

function validateHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function validateBrandingInput(data: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  const hexFields = [
    'primary_color', 'secondary_color', 'accent_color',
    'background_color', 'text_color', 'success_color',
    'warning_color', 'error_color',
  ];

  for (const field of hexFields) {
    const value = data[field];
    if (value !== undefined && value !== null && value !== '') {
      if (!validateHexColor(value as string)) {
        return { valid: false, error: `Invalid hex color for ${field}: ${value}` };
      }
    }
  }

  if (data.border_radius !== undefined) {
    const radius = Number(data.border_radius);
    if (isNaN(radius) || radius < 0 || radius > 24) {
      return { valid: false, error: 'Border radius must be between 0 and 24' };
    }
  }

  if (data.support_email && data.support_email !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.support_email as string)) {
      return { valid: false, error: 'Invalid support email address' };
    }
  }

  if (data.email_from_address && data.email_from_address !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email_from_address as string)) {
      return { valid: false, error: 'Invalid email from address' };
    }
  }

  if (data.custom_css && (data.custom_css as string).length > 10000) {
    return { valid: false, error: 'Custom CSS must be less than 10,000 characters' };
  }

  if (data.custom_head_html && (data.custom_head_html as string).length > 5000) {
    return { valid: false, error: 'Custom HTML must be less than 5,000 characters' };
  }

  if (data.social_links) {
    try {
      const links = typeof data.social_links === 'string'
        ? JSON.parse(data.social_links as string)
        : data.social_links;
      if (typeof links !== 'object' || Array.isArray(links)) {
        return { valid: false, error: 'Social links must be an object' };
      }
    } catch {
      return { valid: false, error: 'Invalid social links JSON' };
    }
  }

  return { valid: true };
}

function sanitizeCustomCss(css: string): string {
  // Remove potentially dangerous CSS
  return css
    .replace(/@import\s+[^;]+;/gi, '') // Remove @import
    .replace(/javascript\s*:/gi, '')   // Remove javascript: URLs
    .replace(/expression\s*\(/gi, '')  // Remove IE expressions
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove embedded scripts
}

function sanitizeCustomHtml(html: string): string {
  // Allow only safe HTML tags and attributes
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript\s*:/gi, '') // Remove javascript: URLs
    .replace(/data\s*:/gi, 'data-unsafe:'); // Neutralize data: URLs
}

function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

// ============================================================
// CLIENT BRANDING CRUD
// ============================================================

export async function getClientBranding(clientId: string): Promise<ClientBranding | null> {
  const cacheKey = `branding:${clientId}`;
  const cached = await cacheGet<ClientBranding>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('client_branding')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error || !data) return null;

  await cacheSet(cacheKey, data, BRANDING_CACHE_TTL);
  return data;
}

export async function upsertClientBranding(
  clientId: string,
  userId: string,
  input: Partial<Omit<ClientBranding, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<ClientBranding> {
  const validation = validateBrandingInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Sanitize custom code
  if (input.custom_css) {
    input.custom_css = sanitizeCustomCss(input.custom_css);
  }

  // Parse social_links if string
  if (typeof input.social_links === 'string') {
    try {
      input.social_links = JSON.parse(input.social_links as string);
    } catch {
      throw new Error('Invalid social links JSON');
    }
  }

  // Check if branding exists
  const { data: existing } = await supabaseAdmin
    .from('client_branding')
    .select('id')
    .eq('client_id', clientId)
    .single();

  let result;

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('client_branding')
      .update(input)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('client_branding')
      .insert({ ...input, client_id: clientId })
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  // Update clients table colors for consistency
  if (input.primary_color || input.secondary_color) {
    await supabaseAdmin
      .from('clients')
      .update({
        primary_color: input.primary_color || result.primary_color,
        secondary_color: input.secondary_color || result.secondary_color,
      })
      .eq('id', clientId);
  }

  // Invalidate cache
  await cacheDelete(`branding:${clientId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'settings.update',
    resource_type: 'branding',
    resource_id: clientId,
    new_value: { updated_fields: Object.keys(input) },
  });

  return result;
}

// ============================================================
// ASSET UPLOAD
// ============================================================

type AssetType = 'logo' | 'college-logo' | 'favicon' | 'banner';

const ASSET_CONFIG: Record<AssetType, {
  allowedTypes: string[];
  maxSize: number;
  path: (clientId: string, ext: string) => string;
}> = {
  logo: {
    allowedTypes: ALLOWED_LOGO_TYPES,
    maxSize: MAX_LOGO_SIZE,
    path: (clientId, ext) => `${clientId}/organization-logo.${ext}`,
  },
  'college-logo': {
    allowedTypes: ALLOWED_LOGO_TYPES,
    maxSize: MAX_LOGO_SIZE,
    path: (clientId, ext) => `${clientId}/college-logo.${ext}`,
  },
  favicon: {
    allowedTypes: ALLOWED_FAVICON_TYPES,
    maxSize: MAX_FAVICON_SIZE,
    path: (clientId, ext) => `${clientId}/favicon.${ext}`,
  },
  banner: {
    allowedTypes: ALLOWED_BANNER_TYPES,
    maxSize: MAX_BANNER_SIZE,
    path: (clientId, ext) => `${clientId}/default-banner.${ext}`,
  },
};

export async function uploadBrandingAsset(
  clientId: string,
  userId: string,
  assetType: AssetType,
  file: File
): Promise<{ url: string; path: string }> {
  const config = ASSET_CONFIG[assetType];

  if (!validateFileType(file, config.allowedTypes)) {
    throw new Error(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`);
  }

  if (!validateFileSize(file, config.maxSize)) {
    const maxMB = Math.round(config.maxSize / (1024 * 1024));
    throw new Error(`File too large. Maximum size: ${maxMB}MB`);
  }

  // Extract extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = config.path(clientId, ext);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to storage
  const result = await uploadFile(BRANDING_BUCKET, path, buffer, file.type);

  // Update branding record
  const fieldMap: Record<AssetType, string> = {
    logo: 'logo_url',
    'college-logo': 'college_logo_url',
    favicon: 'favicon_url',
    banner: 'default_banner_url',
  };

  const field = fieldMap[assetType];
  await supabaseAdmin
    .from('client_branding')
    .update({ [field]: result.url })
    .eq('client_id', clientId);

  // Invalidate cache
  await cacheDelete(`branding:${clientId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'settings.update',
    resource_type: 'branding',
    resource_id: clientId,
    new_value: { asset_type: assetType, url: result.url },
  });

  return { url: result.url, path };
}

export async function deleteBrandingAsset(
  clientId: string,
  userId: string,
  assetType: AssetType
): Promise<void> {
  const fieldMap: Record<AssetType, string> = {
    logo: 'logo_url',
    'college-logo': 'college_logo_url',
    favicon: 'favicon_url',
    banner: 'default_banner_url',
  };

  const field = fieldMap[assetType];

  // Get current URL
  const { data } = await supabaseAdmin
    .from('client_branding')
    .select(field)
    .eq('client_id', clientId)
    .single();

  if (!data || !data[field]) return;

  // Extract path from URL
  const url = data[field] as string;
  const pathMatch = url.match(/branding\/(.+)$/);
  if (pathMatch) {
    await deleteFile(BRANDING_BUCKET, pathMatch[1]);
  }

  // Clear field
  await supabaseAdmin
    .from('client_branding')
    .update({ [field]: null })
    .eq('client_id', clientId);

  await cacheDelete(`branding:${clientId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'settings.update',
    resource_type: 'branding',
    resource_id: clientId,
    new_value: { deleted_asset: assetType },
  });
}

// ============================================================
// EVENT BRANDING
// ============================================================

export async function getEventBranding(eventId: string): Promise<EventBranding | null> {
  const cacheKey = `event-branding:${eventId}`;
  const cached = await cacheGet<EventBranding>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('event_branding')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (error || !data) return null;

  await cacheSet(cacheKey, data, BRANDING_CACHE_TTL);
  return data;
}

export async function upsertEventBranding(
  eventId: string,
  clientId: string,
  userId: string,
  input: Partial<Omit<EventBranding, 'id' | 'event_id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<EventBranding> {
  const validation = validateBrandingInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Sanitize custom code
  if (input.custom_css) {
    input.custom_css = sanitizeCustomCss(input.custom_css);
  }
  if (input.custom_head_html) {
    input.custom_head_html = sanitizeCustomHtml(input.custom_head_html);
  }

  const { data: existing } = await supabaseAdmin
    .from('event_branding')
    .select('id')
    .eq('event_id', eventId)
    .single();

  let result;

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('event_branding')
      .update(input)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('event_branding')
      .insert({ ...input, event_id: eventId, client_id: clientId })
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  await cacheDelete(`event-branding:${eventId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'settings.update',
    resource_type: 'event_branding',
    resource_id: eventId,
    new_value: { updated_fields: Object.keys(input) },
  });

  return result;
}

export async function uploadEventBrandingAsset(
  eventId: string,
  clientId: string,
  userId: string,
  assetType: 'banner' | 'logo',
  file: File
): Promise<{ url: string; path: string }> {
  const config = assetType === 'banner'
    ? { allowedTypes: ALLOWED_BANNER_TYPES, maxSize: MAX_BANNER_SIZE }
    : { allowedTypes: ALLOWED_LOGO_TYPES, maxSize: MAX_LOGO_SIZE };

  if (!validateFileType(file, config.allowedTypes)) {
    throw new Error(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`);
  }

  if (!validateFileSize(file, config.maxSize)) {
    const maxMB = Math.round(config.maxSize / (1024 * 1024));
    throw new Error(`File too large. Maximum size: ${maxMB}MB`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${eventId}/${assetType}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await uploadFile(EVENT_BRANDING_BUCKET, path, buffer, file.type);

  const field = assetType === 'banner' ? 'banner_url' : 'logo_url';
  await supabaseAdmin
    .from('event_branding')
    .update({ [field]: result.url })
    .eq('event_id', eventId);

  await cacheDelete(`event-branding:${eventId}`);

  return { url: result.url, path };
}

// ============================================================
// BRANDING RESOLUTION
// ============================================================

export async function resolveBranding(clientId: string): Promise<ResolvedBranding> {
  const branding = await getClientBranding(clientId);

  const defaults: ResolvedBranding = {
    brand_name: null,
    tagline: null,
    logo_url: null,
    college_logo_url: null,
    favicon_url: null,
    default_banner_url: null,
    primary_color: '#3B82F6',
    secondary_color: '#1D4ED8',
    accent_color: '#10B981',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    success_color: '#10B981',
    warning_color: '#F59E0B',
    error_color: '#EF4444',
    font_family: 'Inter, system-ui, sans-serif',
    font_heading_family: null,
    border_radius: 8,
    white_label_enabled: false,
    footer_text: null,
    support_email: null,
    support_phone: null,
    social_links: {},
    email_from_name: null,
    email_from_address: null,
    email_reply_to: null,
    footer_company_name: null,
    footer_website_url: null,
    footer_copyright: null,
    custom_css: null,
    custom_head_html: null,
  };

  if (!branding) return defaults;

  return {
    ...defaults,
    ...branding,
    custom_css: null,
    custom_head_html: null,
  };
}

export async function resolveEventBranding(eventId: string): Promise<ResolvedBranding> {
  // Get event's client_id
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('client_id')
    .eq('id', eventId)
    .single();

  if (!event) {
    throw new Error('Event not found');
  }

  // Get client branding
  const clientBranding = await resolveBranding(event.client_id);

  // Get event overrides
  const eventBranding = await getEventBranding(eventId);

  if (!eventBranding) return clientBranding;

  // Merge: event overrides client
  const merged: ResolvedBranding = {
    ...clientBranding,
    banner_url: eventBranding.banner_url || clientBranding.default_banner_url,
    logo_url: eventBranding.logo_url || clientBranding.logo_url,
    primary_color: eventBranding.primary_color || clientBranding.primary_color,
    secondary_color: eventBranding.secondary_color || clientBranding.secondary_color,
    accent_color: eventBranding.accent_color || clientBranding.accent_color,
    background_color: eventBranding.background_color || clientBranding.background_color,
    text_color: eventBranding.text_color || clientBranding.text_color,
    custom_css: eventBranding.custom_css || null,
    custom_head_html: eventBranding.custom_head_html || null,
  };

  return merged;
}

export async function resolveBrandingByDomain(domain: string): Promise<ResolvedBranding | null> {
  const cacheKey = `domain-branding:${domain}`;
  const cached = await cacheGet<ResolvedBranding>(cacheKey);
  if (cached) return cached;

  // Check client_domains table
  const { data: domainRecord } = await supabaseAdmin
    .from('client_domains')
    .select('client_id')
    .eq('domain', domain)
    .eq('verified', true)
    .single();

  if (domainRecord) {
    const branding = await resolveBranding(domainRecord.client_id);
    await cacheSet(cacheKey, branding, BRANDING_CACHE_TTL);
    return branding;
  }

  // Check clients.custom_domain
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('custom_domain', domain)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single();

  if (client) {
    const branding = await resolveBranding(client.id);
    await cacheSet(cacheKey, branding, BRANDING_CACHE_TTL);
    return branding;
  }

  return null;
}

// ============================================================
// CSS GENERATION
// ============================================================

export function generateBrandCss(branding: ResolvedBranding): string {
  return `:root {
  --brand-primary: ${branding.primary_color};
  --brand-secondary: ${branding.secondary_color};
  --brand-accent: ${branding.accent_color};
  --brand-bg: ${branding.background_color};
  --brand-text: ${branding.text_color};
  --brand-success: ${branding.success_color};
  --brand-warning: ${branding.warning_color};
  --brand-error: ${branding.error_color};
  --brand-font: ${branding.font_family};
  --brand-font-heading: ${branding.font_heading_family || branding.font_family};
  --brand-radius: ${branding.border_radius}px;
}`;
}

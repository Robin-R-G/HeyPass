import { z } from 'zod';

// ============================================================
// AUTH VALIDATORS
// ============================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .max(255, 'Email is too long')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string(),
    first_name: z
      .string()
      .max(100, 'First name is too long')
      .optional()
      .transform((v) => v?.trim() || undefined),
    last_name: z
      .string()
      .max(100, 'Last name is too long')
      .optional()
      .transform((v) => v?.trim() || undefined),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

export const resetPasswordConfirmSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Reset code is required')
      .max(64, 'Invalid reset code'),
    user_id: z
      .string()
      .uuid('Invalid user ID'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const selectClientSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
});

// ============================================================
// CLIENT VALIDATORS
// ============================================================

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name is too long')
    .trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  domain: z
    .string()
    .url('Invalid domain URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  logo_url: z
    .string()
    .url('Invalid logo URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  plan_id: z.string().uuid('Invalid plan ID').optional(),
});

// ============================================================
// ROLE VALIDATORS
// ============================================================

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name is too long')
    .trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug is too long')
    .regex(/^[a-z_]+$/, 'Slug must be lowercase with underscores only'),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional(),
  level: z
    .number()
    .int('Level must be an integer')
    .min(0, 'Level must be at least 0')
    .max(100, 'Level must be at most 100'),
  is_system: z.boolean().optional().default(false),
});

// ============================================================
// EVENT VALIDATORS
// ============================================================

export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(200, 'Event name is too long')
    .trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z
    .string()
    .max(5000, 'Description is too long')
    .optional(),
  short_description: z
    .string()
    .max(500, 'Short description is too long')
    .optional(),
  event_type: z.enum([
    'conference',
    'workshop',
    'seminar',
    'webinar',
    'meeting',
    'concert',
    'sports',
    'exhibition',
    'other',
  ]),
  status: z
    .enum(['draft', 'published', 'cancelled', 'completed'])
    .optional()
    .default('draft'),
  start_date: z
    .string()
    .datetime('Invalid start date')
    .or(z.date().transform((d) => d.toISOString())),
  end_date: z
    .string()
    .datetime('Invalid end date')
    .or(z.date().transform((d) => d.toISOString())),
  registration_start: z
    .string()
    .datetime()
    .or(z.date().transform((d) => d.toISOString()))
    .optional(),
  registration_end: z
    .string()
    .datetime()
    .or(z.date().transform((d) => d.toISOString()))
    .optional(),
  venue_id: z.string().uuid('Invalid venue ID').optional(),
  max_attendees: z
    .number()
    .int('Max attendees must be an integer')
    .positive('Max attendees must be positive')
    .optional(),
  timezone: z.string().default('UTC'),
  is_public: z.boolean().default(true),
  requires_approval: z.boolean().default(false),
  allow_waitlist: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const updateEventSchema = createEventSchema.partial();

// ============================================================
// REGISTRATION VALIDATORS
// ============================================================

export const registerForEventSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long')
    .trim(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .max(20, 'Phone number is too long')
    .optional(),
  company: z
    .string()
    .max(200, 'Company name is too long')
    .optional(),
  job_title: z
    .string()
    .max(200, 'Job title is too long')
    .optional(),
  custom_fields: z.record(z.unknown()).optional(),
  coupon_code: z
    .string()
    .max(50, 'Coupon code is too long')
    .optional(),
});

// ============================================================
// CHECK-IN VALIDATORS
// ============================================================

export const checkInSchema = z.object({
  ticket_code: z
    .string()
    .min(1, 'Ticket code is required')
    .max(100, 'Ticket code is too long'),
  method: z.enum(['qr_scan', 'manual', 'nfc']),
  notes: z
    .string()
    .max(500, 'Notes are too long')
    .optional(),
});

export const checkOutSchema = z.object({
  registration_id: z.string().uuid('Invalid registration ID'),
  notes: z
    .string()
    .max(500, 'Notes are too long')
    .optional(),
});

// ============================================================
// CERTIFICATE VALIDATORS
// ============================================================

export const generateCertificateSchema = z.object({
  registration_id: z.string().uuid('Invalid registration ID'),
  template_id: z.string().uuid('Invalid template ID').optional(),
  certificate_type: z.enum([
    'participation',
    'volunteer',
    'organizer',
    'speaker',
    'winner',
    'runner_up',
  ]),
  custom_fields: z.record(z.string()).optional(),
});

// ============================================================
// SETTINGS VALIDATORS
// ============================================================

export const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()),
  category: z
    .enum([
      'general',
      'branding',
      'email',
      'certificate',
      'payment',
      'attendance',
      'notification',
    ])
    .optional(),
});

// ============================================================
// PAGINATION VALIDATORS
// ============================================================

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v || '1', 10) || 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v || '20', 10) || 20))),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(200).optional(),
});

// ============================================================
// BRANDING VALIDATORS
// ============================================================

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const updateBrandingSchema = z.object({
  brand_name: z
    .string()
    .max(255, 'Brand name is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
  tagline: z
    .string()
    .max(500, 'Tagline is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
  primary_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  secondary_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  accent_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  background_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  text_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  success_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  warning_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  error_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  font_family: z
    .string()
    .max(255, 'Font family is too long')
    .optional(),
  font_heading_family: z
    .string()
    .max(255, 'Font heading family is too long')
    .optional(),
  border_radius: z
    .number()
    .int('Border radius must be an integer')
    .min(0, 'Border radius must be at least 0')
    .max(24, 'Border radius must be at most 24')
    .optional(),
  white_label_enabled: z.boolean().optional(),
  footer_text: z
    .string()
    .max(1000, 'Footer text is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
  support_email: z
    .string()
    .email('Invalid support email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  support_phone: z
    .string()
    .max(50, 'Support phone is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
  social_links: z
    .record(z.string())
    .optional(),
  email_from_name: z
    .string()
    .max(255, 'Email from name is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
  email_from_address: z
    .string()
    .email('Invalid email from address')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  email_reply_to: z
    .string()
    .email('Invalid reply-to email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  footer_company_name: z
    .string()
    .max(255, 'Footer company name is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
  footer_website_url: z
    .string()
    .url('Invalid footer website URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  footer_copyright: z
    .string()
    .max(500, 'Footer copyright is too long')
    .optional()
    .transform((v) => v?.trim() || undefined),
});

export const updateEventBrandingSchema = z.object({
  banner_url: z
    .string()
    .url('Invalid banner URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  logo_url: z
    .string()
    .url('Invalid logo URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  primary_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  secondary_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  accent_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  background_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  text_color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .optional(),
  custom_css: z
    .string()
    .max(10000, 'Custom CSS must be less than 10,000 characters')
    .optional()
    .transform((v) => v?.trim() || undefined),
  custom_head_html: z
    .string()
    .max(5000, 'Custom HTML must be less than 5,000 characters')
    .optional()
    .transform((v) => v?.trim() || undefined),
});

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .max(253, 'Domain is too long')
    .trim()
    .toLowerCase(),
});

export const deleteDomainSchema = z.object({
  id: z.string().uuid('Invalid domain ID'),
});

export const verifyDomainSchema = z.object({
  id: z.string().uuid('Invalid domain ID'),
});

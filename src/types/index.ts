export type RoleSlug = 'owner' | 'admin' | 'manager' | 'volunteer' | 'scanner';

export type ClientStatus = 'active' | 'suspended' | 'deactivated';
export type MembershipStatus = 'active' | 'invited' | 'suspended';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventType = 'conference' | 'workshop' | 'fest' | 'meetup' | 'competition' | 'seminar' | 'other';
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out' | 'waitlisted';
export type TicketStatus = 'active' | 'used' | 'cancelled' | 'transferred';
export type CertificateStatus = 'generated' | 'delivered' | 'downloaded' | 'revoked';
export type CertificateType = 'participation' | 'volunteer' | 'organizer' | 'speaker' | 'winner' | 'runner_up';
export type ScanType = 'check_in' | 'check_out';

export interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  plan_id: string | null;
  status: ClientStatus;
  max_events: number;
  max_users: number;
  storage_limit_mb: number;
  retention_days: number;
  auto_checkout_grace_minutes: number;
  verification_rate_limit: number;
  zip_export_limit: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email_verified_at: string | null;
  last_login_at: string | null;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientMembership {
  id: string;
  client_id: string;
  user_id: string;
  role_id: string;
  status: MembershipStatus;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  client_id: string;
  name: string;
  slug: RoleSlug;
  description: string | null;
  is_system: boolean;
  priority: number;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface Event {
  id: string;
  client_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  start_date: string;
  end_date: string;
  timezone: string;
  max_capacity: number | null;
  is_virtual: boolean;
  virtual_link: string | null;
  is_public: boolean;
  banner_url: string | null;
  thumbnail_url: string | null;
  created_by: string;
  certificate_status: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  event_id: string;
  client_id: string;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  venue_id: string | null;
  max_capacity: number | null;
  track: string | null;
  is_required: boolean;
  status: string;
  created_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  client_id: string;
  ticket_type_id: string | null;
  status: RegistrationStatus;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
  custom_fields: Record<string, unknown> | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  registration_id: string;
  event_id: string;
  client_id: string;
  ticket_number: string;
  qr_code_hash: string;
  qr_code_url: string | null;
  access_token: string;
  pdf_url: string | null;
  status: TicketStatus;
  checked_in_at: string | null;
  checked_out_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  client_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  capacity: number | null;
  tickets_sold: number;
  max_per_order: number;
  sales_start: string | null;
  sales_end: string | null;
  is_active: boolean;
}

export interface CheckIn {
  id: string;
  client_id: string;
  event_id: string;
  session_id: string | null;
  registration_id: string;
  ticket_id: string;
  staff_id: string | null;
  station_id: string | null;
  scan_type: ScanType;
  scanned_at: string;
  is_offline: boolean;
  created_at: string;
}

export interface CheckOut {
  id: string;
  client_id: string;
  event_id: string;
  check_in_id: string;
  registration_id: string;
  ticket_id: string;
  staff_id: string | null;
  scanned_at: string;
  auto_checkout: boolean;
  duration_minutes: number | null;
}

export interface Certificate {
  id: string;
  client_id: string;
  event_id: string;
  session_id: string | null;
  registration_id: string;
  template_id: string;
  type_id: string;
  certificate_number: string;
  access_token: string;
  template_version: number;
  version: number;
  status: CertificateStatus;
  pdf_url: string | null;
  png_url: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown> | null;
  issued_at: string;
  delivered_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export interface CertificateTemplate {
  id: string;
  client_id: string;
  type_id: string;
  name: string;
  version: number;
  is_active: boolean;
  orientation: string;
  page_size: string;
  background_url: string | null;
  layout: Record<string, unknown>;
  fields: Record<string, unknown>;
  fonts: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  client_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
}

export interface AttendanceSummary {
  id: string;
  client_id: string;
  event_id: string;
  registration_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  duration_minutes: number | null;
  attendance_percentage: number | null;
  is_eligible: boolean | null;
  eligibility_reason: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface JWTPayload {
  sub: string;
  email: string;
  client_id: string | null;
  role: string | null;
  is_superadmin?: boolean;
  iat?: number;
  exp?: number;
}

// ============================================================
// NEW TYPES: Payment Methods, Pricing, Manual Certs, Live Attendance
// ============================================================

export interface PaymentMethod {
  id: string;
  client_id: string;
  method_type: 'bank_account' | 'upi';
  bank_name: string | null;
  account_holder_name: string;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  upi_id: string | null;
  upi_qr_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface EventPricing {
  is_free: boolean;
  ticket_price: number;
  currency: string;
  payment_method_ids: string[];
}

export interface SessionPricing {
  is_free: boolean;
  ticket_price: number;
  currency: string;
}

export interface SessionAttendance {
  session_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  max_capacity: number | null;
  registrations_count: number;
  total_registered: number;
  total_checked_in: number;
  total_checked_out: number;
  last_check_in_at: string | null;
  attendance_percentage: number;
}

export interface TicketPreview {
  ticket_number: string;
  event_title: string;
  event_date: string;
  event_location: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type: string;
  price: number;
  currency: string;
  qr_code_data_url: string;
  qr_code_hash: string;
  access_token: string;
}

export interface ManualCertificateInput {
  event_id: string;
  template_id: string;
  type_id: string;
  name: string;
  email?: string;
  event_title?: string;
  event_date?: string;
  custom_fields?: Record<string, string>;
}

export interface EventTicketStats {
  total_tickets: number;
  active_tickets: number;
  used_tickets: number;
  cancelled_tickets: number;
  total_registrations: number;
  checked_in_registrations: number;
  pending_revenue: number;
  collected_revenue: number;
}

export interface EventStats {
  tickets: EventTicketStats;
  certificates: {
    total: number;
    generated: number;
    delivered: number;
    downloaded: number;
    revoked: number;
  };
  sessions: SessionAttendance[];
  recent_registrations: Registration[];
}

export interface Payment {
  id: string;
  client_id: string;
  event_id: string;
  registration_id: string | null;
  session_id: string | null;
  payment_method_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_ref: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

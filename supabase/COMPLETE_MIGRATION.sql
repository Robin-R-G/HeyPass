-- ================================================================
-- HEYPASS — COMPLETE MASTER MIGRATION (001-020)
-- Run this ONE TIME in Supabase SQL Editor
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- FUNCTIONS FIRST (needed by everything)
-- ================================================================

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_time_millis BIGINT;
  v_bytes BYTEA;
BEGIN
  v_time_millis := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_bytes := gen_random_bytes(16);
  v_bytes := SET_BYTE(v_bytes, 6, (GET_BYTE(v_bytes, 6) & 15) | 112);
  v_bytes := SET_BYTE(v_bytes, 8, (GET_BYTE(v_bytes, 8) & 63) | 128);
  v_bytes := SET_BYTE(v_bytes, 0, ((v_time_millis >> 40) & 255)::INT);
  v_bytes := SET_BYTE(v_bytes, 1, ((v_time_millis >> 32) & 255)::INT);
  v_bytes := SET_BYTE(v_bytes, 2, ((v_time_millis >> 24) & 255)::INT);
  v_bytes := SET_BYTE(v_bytes, 3, ((v_time_millis >> 16) & 255)::INT);
  v_bytes := SET_BYTE(v_bytes, 4, ((v_time_millis >> 8) & 255)::INT);
  v_bytes := SET_BYTE(v_bytes, 5, (v_time_millis & 255)::INT);
  RETURN ENCODE(v_bytes, 'hex')::UUID;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ================================================================
-- CORE TABLES (001)
-- ================================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1D4ED8',
  custom_domain VARCHAR(255) UNIQUE,
  plan_id UUID,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  max_events INT DEFAULT 10,
  max_users INT DEFAULT 25,
  storage_limit_mb INT DEFAULT 1000,
  retention_days INT DEFAULT 1825,
  auto_checkout_grace_minutes INT DEFAULT 30,
  verification_rate_limit INT DEFAULT 50,
  zip_export_limit INT DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  phone VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(client_id, user_id)
);

-- subscription_plans (FINAL version with all columns from 001+019)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'subscription' CHECK (type IN ('subscription', 'single_event')),
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_annual DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  price_per_event DECIMAL(10,2) DEFAULT 0,
  event_registration_limit INT DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 2.5,
  max_events INT DEFAULT 10,
  max_registrations INT DEFAULT 100,
  max_team_members INT DEFAULT 5,
  max_users INT DEFAULT 25,
  storage_limit_mb INT DEFAULT 1000,
  regeneration_limit_monthly INT DEFAULT 0,
  regeneration_limit_event INT DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_retention_days INT DEFAULT 1825,
  thumbnail_retention_days INT DEFAULT 90,
  temp_file_retention_hours INT DEFAULT 24,
  auto_delete_expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE clients ADD CONSTRAINT fk_clients_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);

CREATE TABLE IF NOT EXISTS client_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(domain)
);

CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- ROLES & PERMISSIONS (002)
-- ================================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(client_id, slug)
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  token_hash VARCHAR(64) NOT NULL,
  refresh_token_hash VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) UNIQUE NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permissions seed
INSERT INTO permissions (name, resource, action, description) VALUES
  ('client.view','client','view','View client settings'),
  ('client.edit','client','edit','Edit client settings'),
  ('client.delete','client','delete','Delete client'),
  ('users.view','users','view','View users'),
  ('users.invite','users','invite','Invite users'),
  ('users.edit','users','edit','Edit users'),
  ('users.remove','users','remove','Remove users'),
  ('roles.view','roles','view','View roles'),
  ('roles.create','roles','create','Create roles'),
  ('roles.edit','roles','edit','Edit roles'),
  ('roles.delete','roles','delete','Delete roles'),
  ('events.view','events','view','View events'),
  ('events.create','events','create','Create events'),
  ('events.edit','events','edit','Edit events'),
  ('events.delete','events','delete','Delete events'),
  ('events.publish','events','publish','Publish/unpublish events'),
  ('events.close','events','close','Close events'),
  ('events.clone','events','clone','Clone events'),
  ('sessions.view','sessions','view','View sessions'),
  ('sessions.create','sessions','create','Create sessions'),
  ('sessions.edit','sessions','edit','Edit sessions'),
  ('sessions.delete','sessions','delete','Delete sessions'),
  ('registrations.view','registrations','view','View registrations'),
  ('registrations.create','registrations','create','Create registrations'),
  ('registrations.edit','registrations','edit','Edit registrations'),
  ('registrations.delete','registrations','delete','Delete registrations'),
  ('registrations.export','registrations','export','Export registrations'),
  ('tickets.view','tickets','view','View tickets'),
  ('tickets.validate','tickets','validate','Validate tickets'),
  ('tickets.transfer','tickets','transfer','Transfer tickets'),
  ('checkin.perform','checkin','perform','Perform check-in'),
  ('checkin.view','checkin','view','View check-in data'),
  ('checkout.perform','checkout','perform','Perform check-out'),
  ('checkout.view','checkout','view','View check-out data'),
  ('certificates.view','certificates','view','View certificates'),
  ('certificates.generate','certificates','generate','Generate certificates'),
  ('certificates.download','certificates','download','Download certificates'),
  ('certificates.revoke','certificates','revoke','Revoke certificates'),
  ('certificates.templates','certificates','templates','Manage certificate templates'),
  ('theme.view','theme','view','View theme settings'),
  ('theme.edit','theme','edit','Edit theme settings'),
  ('analytics.view','analytics','view','View analytics'),
  ('analytics.export','analytics','export','Export analytics'),
  ('billing.view','billing','view','View billing'),
  ('billing.manage','billing','manage','Manage billing'),
  ('settings.view','settings','view','View settings'),
  ('settings.edit','settings','edit','Edit settings'),
  ('user.role_assign','user','role_assign','Assign or change user roles'),
  ('user.impersonate','user','impersonate','Log in as another user'),
  ('event.manage_staff','event','manage_staff','Assign staff to events'),
  ('event.configure_branding','event','configure_branding','Configure event branding'),
  ('registration.approve','registration','approve','Approve or deny registrations'),
  ('registration.refund','registration','refund','Process refunds'),
  ('registration.cancel','registration','cancel','Cancel registrations'),
  ('registration.waitlist_view','registration','waitlist_view','View waitlist'),
  ('registration.waitlist_promote','registration','waitlist_promote','Promote from waitlist'),
  ('coupon.create','coupon','create','Create discount coupons'),
  ('coupon.view','coupon','view','View coupons'),
  ('coupon.delete','coupon','delete','Delete coupons'),
  ('ticket.scan','ticket','scan','Scan tickets for check-in'),
  ('ticket.checkout','ticket','checkout','Perform check-out'),
  ('ticket.override','ticket','override','Override check-in errors'),
  ('checkin.override','checkin','override','Override check-in errors'),
  ('checkin.export','checkin','export','Export check-in data'),
  ('checkin.offline_upload','checkin','offline_upload','Upload offline scan data'),
  ('checkout.manual','checkout','manual','Perform manual check-out'),
  ('checkout.export','checkout','export','Export check-out data'),
  ('checkout.auto_configure','checkout','auto_configure','Configure auto check-out'),
  ('attendance.view','attendance','view','View attendance report'),
  ('attendance.export','attendance','export','Export attendance data'),
  ('certificate.regenerate','certificate','regenerate','Regenerate certificates'),
  ('certificate.export','certificate','export','Export certificates as ZIP'),
  ('certificate.verify','certificate','verify','Verify certificates (public)'),
  ('certificate.upload_assets','certificate','upload_assets','Upload certificate assets'),
  ('certificate.configure_defaults','certificate','configure_defaults','Set certificate defaults'),
  ('verification.configure','verification','configure','Configure verification settings'),
  ('verification.logs_view','verification','logs_view','View verification logs'),
  ('audit.view','audit','view','View audit logs'),
  ('audit.export','audit','export','Export audit logs'),
  ('apikey.view','apikey','view','View API keys'),
  ('apikey.create','apikey','create','Create API keys'),
  ('apikey.revoke','apikey','revoke','Revoke API keys'),
  ('webhook.view','webhook','view','View webhook configurations'),
  ('webhook.manage','webhook','manage','Create/edit/delete webhooks'),
  ('data.export','data','export','Export all platform data'),
  ('billing.invoice_download','billing','invoice_download','Download invoices'),
  ('billing.plan_view','billing','plan_view','View subscription/plan'),
  ('billing.plan_change','billing','plan_change','Change subscription plan'),
  ('billing.cancel','billing','cancel','Cancel subscription'),
  ('email.template_view','email','template_view','View email templates'),
  ('email.template_manage','email','template_manage','Create/edit email templates'),
  ('branding.update','branding','update','Update client branding')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- EVENTS (003)
-- ================================================================

CREATE TABLE IF NOT EXISTS event_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(client_id, slug)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID REFERENCES event_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  event_type VARCHAR(50) NOT NULL DEFAULT 'conference' CHECK (event_type IN ('conference', 'workshop', 'fest', 'meetup', 'competition', 'seminar', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  max_capacity INT,
  is_virtual BOOLEAN DEFAULT FALSE,
  virtual_link VARCHAR(500),
  is_public BOOLEAN DEFAULT TRUE,
  banner_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  created_by UUID NOT NULL REFERENCES users(id),
  certificate_status VARCHAR(20) DEFAULT 'pending' CHECK (certificate_status IN ('pending', 'generated', 'partial', 'failed')),
  is_free BOOLEAN DEFAULT TRUE,
  ticket_price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(client_id, slug)
);

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  capacity INT,
  is_virtual BOOLEAN DEFAULT FALSE,
  virtual_link VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_type VARCHAR(50) DEFAULT 'talk' CHECK (session_type IN ('talk', 'workshop', 'panel', 'competition', 'break', 'networking', 'other')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  max_capacity INT,
  track VARCHAR(100),
  is_required BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  is_free BOOLEAN DEFAULT TRUE,
  ticket_price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'INR',
  registrations_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS session_speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  bio TEXT,
  photo_url VARCHAR(500),
  organization VARCHAR(255),
  is_moderator BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- ================================================================
-- REGISTRATIONS & TICKETS (004)
-- ================================================================

CREATE TABLE IF NOT EXISTS registration_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Default Form',
  is_active BOOLEAN DEFAULT TRUE,
  is_multi_step BOOLEAN DEFAULT FALSE,
  steps_config JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  placeholder VARCHAR(255),
  is_required BOOLEAN DEFAULT FALSE,
  is_unique BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  options JSONB,
  validation JSONB,
  conditional_logic JSONB,
  section_id UUID,
  default_value TEXT,
  help_text VARCHAR(500),
  is_readonly BOOLEAN DEFAULT FALSE,
  conditional_required JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ticket_type_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'waitlisted')),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(255),
  job_title VARCHAR(255),
  custom_fields JSONB,
  source VARCHAR(50),
  referral_code VARCHAR(50),
  notes TEXT,
  ip_address INET,
  user_agent TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  qr_code_hash VARCHAR(64) UNIQUE NOT NULL,
  qr_code_url VARCHAR(500),
  access_token VARCHAR(64) UNIQUE NOT NULL,
  pdf_url VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'transferred')),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  qr_version INT DEFAULT 1,
  qr_last_rotated_at TIMESTAMPTZ,
  qr_rotation_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code, event_id)
);

CREATE TABLE IF NOT EXISTS waitlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  position INT NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, email)
);

-- ================================================================
-- ATTENDANCE (005)
-- ================================================================

CREATE TABLE IF NOT EXISTS check_in_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  device_id VARCHAR(100),
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_ping_at TIMESTAMPTZ,
  gate_type VARCHAR(20) DEFAULT 'main_entrance',
  max_scans_per_min INT DEFAULT 60,
  assigned_sessions UUID[] DEFAULT '{}',
  auto_checkout_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  station_id UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  scan_type VARCHAR(20) DEFAULT 'check_in' CHECK (scan_type IN ('check_in', 'check_out')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qr_data TEXT,
  ip_address INET,
  device_id VARCHAR(100),
  is_offline BOOLEAN DEFAULT FALSE,
  sync_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_outs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  check_in_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  station_id UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_checkout BOOLEAN DEFAULT FALSE,
  duration_minutes INT,
  is_offline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  duration_minutes INT,
  attendance_percentage DECIMAL(5,2),
  is_eligible BOOLEAN,
  eligibility_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(registration_id)
);

CREATE TABLE IF NOT EXISTS offline_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  scan_type VARCHAR(20) NOT NULL,
  ticket_id UUID NOT NULL,
  event_id UUID NOT NULL,
  registration_id UUID NOT NULL,
  staff_id UUID,
  scanned_at TIMESTAMPTZ NOT NULL,
  qr_data TEXT,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- CERTIFICATES (006)
-- ================================================================

CREATE TABLE IF NOT EXISTS certificate_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(client_id, slug)
);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES certificate_types(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  orientation VARCHAR(20) DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  page_size VARCHAR(20) DEFAULT 'A4',
  background_url VARCHAR(500),
  logo_url VARCHAR(500),
  layout JSONB NOT NULL,
  fields JSONB NOT NULL,
  fonts JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS certificate_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, year)
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT,
  type_id UUID NOT NULL REFERENCES certificate_types(id) ON DELETE RESTRICT,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  access_token VARCHAR(64) UNIQUE NOT NULL,
  template_version INT NOT NULL,
  version INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'delivered', 'downloaded', 'revoked')),
  pdf_url VARCHAR(500),
  png_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  metadata JSONB,
  is_manual BOOLEAN DEFAULT FALSE,
  manual_data JSONB,
  content_hash VARCHAR(64),
  template_snapshot JSONB,
  token_expires_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS certificate_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  method VARCHAR(20) NOT NULL CHECK (method IN ('number', 'qr_code', 'url')),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certificate_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  download_type VARCHAR(20) NOT NULL CHECK (download_type IN ('pdf', 'png', 'zip')),
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certificate_share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INT DEFAULT 0,
  max_access INT DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- QR SECURITY (014)
-- ================================================================

CREATE TABLE IF NOT EXISTS qr_nonces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  nonce VARCHAR(64) UNIQUE NOT NULL,
  hmac_signature VARCHAR(64) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  used_at TIMESTAMPTZ,
  used_by_station UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qr_scan_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  nonce VARCHAR(64),
  station_id UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scan_result VARCHAR(20) NOT NULL CHECK (scan_result IN ('success', 'duplicate', 'expired', 'invalid', 'fraud_suspected')),
  ip_address INET,
  device_id VARCHAR(100),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qr_payload JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- GATE MANAGEMENT (015)
-- ================================================================

CREATE TABLE IF NOT EXISTS gate_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gate_id, session_id)
);

CREATE TABLE IF NOT EXISTS gate_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'scanner' CHECK (role IN ('scanner', 'supervisor', 'admin')),
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gate_id, staff_id)
);

CREATE TABLE IF NOT EXISTS gate_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_scans INT DEFAULT 0,
  successful_checkins INT DEFAULT 0,
  successful_checkouts INT DEFAULT 0,
  duplicates_blocked INT DEFAULT 0,
  invalid_rejected INT DEFAULT 0,
  fraud_suspected INT DEFAULT 0,
  last_scan_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gate_id, event_id)
);

CREATE TABLE IF NOT EXISTS attendance_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  require_checkout BOOLEAN DEFAULT FALSE,
  auto_checkout_enabled BOOLEAN DEFAULT TRUE,
  auto_checkout_grace_minutes INT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id)
);

-- ================================================================
-- PAYMENTS (013)
-- ================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('bank_account', 'upi')),
  bank_name VARCHAR(255),
  account_holder_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(30),
  ifsc_code VARCHAR(15),
  upi_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_ref VARCHAR(255),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_checked_in INT DEFAULT 0,
  total_checked_out INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);

-- ================================================================
-- NOTIFICATIONS (017)
-- ================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- INTEGRATIONS (018)
-- ================================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  response_code INT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  click_count INT DEFAULT 0,
  registration_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- BILLING (019)
-- ================================================================

CREATE TABLE IF NOT EXISTS client_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_gateway_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('razorpay', 'cashfree')),
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  is_live BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, provider)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'commission', 'refund', 'credit')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'INR',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID,
  transaction_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_payout DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'refunded')),
  transaction_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('velocity', 'amount', 'duplicate', 'pattern')),
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Single event plans (020)
CREATE TABLE IF NOT EXISTS event_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  registration_limit INT NOT NULL DEFAULT 0,
  registrations_used INT NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- BRANDING (011)
-- ================================================================

CREATE TABLE IF NOT EXISTS client_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_name VARCHAR(255),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1D4ED8',
  white_label_enabled BOOLEAN DEFAULT FALSE,
  email_from_name VARCHAR(255),
  email_from_address VARCHAR(255),
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS event_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  banner_url VARCHAR(500),
  primary_color VARCHAR(7),
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id)
);

-- ================================================================
-- TRIGGERS
-- ================================================================

DO $$ BEGIN
  CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_client_memberships_updated_at BEFORE UPDATE ON client_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-seed roles on client creation
CREATE OR REPLACE FUNCTION seed_client_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO roles (client_id, name, slug, description, is_system, priority) VALUES
    (NEW.id, 'Owner', 'owner', 'Full access', TRUE, 100),
    (NEW.id, 'Admin', 'admin', 'Full access to all modules', TRUE, 90),
    (NEW.id, 'Manager', 'manager', 'Can create and manage events', TRUE, 70),
    (NEW.id, 'Volunteer', 'volunteer', 'Can manage check-ins', TRUE, 50),
    (NEW.id, 'Scanner', 'scanner', 'Can only perform check-in/out', TRUE, 30);
  INSERT INTO certificate_types (client_id, name, slug) VALUES
    (NEW.id, 'Participation', 'participation'),
    (NEW.id, 'Volunteer', 'volunteer'),
    (NEW.id, 'Organizer', 'organizer'),
    (NEW.id, 'Speaker', 'speaker'),
    (NEW.id, 'Winner', 'winner'),
    (NEW.id, 'Runner-Up', 'runner-up');
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER after_client_insert AFTER INSERT ON clients FOR EACH ROW EXECUTE FUNCTION seed_client_roles();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- SEED PLANS
-- ================================================================

INSERT INTO subscription_plans (name, slug, price_monthly, price_annual, price_per_event, event_registration_limit, commission_rate, max_events, max_registrations, max_team_members, features, display_order) VALUES
  ('Free', 'free', 0, 0, 0, 0, 0.5, 3, 100, 5, '["basic_events","basic_certificates"]', 1),
  ('Starter', 'starter', 999, 7992, 0, 0, 2.0, 10, 1000, 10, '["all_events","all_certificates","white_label","analytics"]', 2),
  ('Professional', 'professional', 2999, 23992, 0, 0, 1.5, 50, 10000, 25, '["all_events","all_certificates","white_label","analytics","api_access","webhooks"]', 3),
  ('Enterprise', 'enterprise', 9999, 79992, 0, 0, 1.0, -1, -1, -1, '["unlimited","all_features","sla"]', 4),
  ('Event Starter', 'event-starter', 0, 0, 199, 100, 2.5, 1, 100, 5, '["basic_certificates","analytics"]', 10),
  ('Event Pro', 'event-pro', 0, 0, 499, 500, 2.0, 1, 500, 10, '["all_certificates","analytics","white_label"]', 11),
  ('Event Enterprise', 'event-enterprise', 0, 0, 999, 5000, 1.5, 1, 5000, 25, '["all_certificates","analytics","white_label","custom_domain"]', 12)
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- RLS HELPER FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION get_client_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'client_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'sub', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(50) LANGUAGE SQL STABLE AS $$
  SELECT r.slug FROM client_memberships cm JOIN roles r ON r.id = cm.role_id
  WHERE cm.user_id = get_user_id() AND cm.client_id = get_client_id() AND cm.status = 'active' AND cm.deleted_at IS NULL;
$$;

-- ================================================================
-- ENABLE RLS ON ALL TABLES
-- ================================================================

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'clients','users','client_memberships','client_settings','roles','role_permissions',
    'user_sessions','api_keys','audit_logs','events','event_categories','venues','sessions',
    'session_speakers','registration_forms','form_fields','registrations','tickets','coupons',
    'waitlists','check_in_stations','check_ins','check_outs','attendance_summary','offline_scans',
    'certificate_types','certificate_templates','certificate_sequences','certificates',
    'certificate_verifications','certificate_downloads','certificate_share_links',
    'qr_nonces','qr_scan_attempts','gate_sessions','gate_staff','gate_stats','attendance_rules',
    'payment_methods','payments','session_attendance',
    'notification_templates','notifications','webhook_endpoints','webhook_deliveries','registration_links',
    'subscription_plans','client_subscriptions','payment_gateway_config','invoices','commissions',
    'fraud_rules','fraud_alerts',    'event_subscriptions','client_branding','event_branding'
  ]) LOOP
    EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;

-- ================================================================
-- MIGRATION 021: VOLUNTEER MANAGEMENT
-- ================================================================

CREATE TABLE IF NOT EXISTS volunteer_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  location        VARCHAR(255),
  task_type       VARCHAR(50) DEFAULT 'general'
                    CHECK (task_type IN ('general','registration','usher','stage','hospitality','security','transport','media','other')),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  slots_total     INT DEFAULT 1,
  slots_filled    INT DEFAULT 0,
  skills_required JSONB,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vol_tasks_event ON volunteer_tasks(event_id, is_active);

CREATE TABLE IF NOT EXISTS volunteer_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(20),
  skills            JSONB,
  availability_json JSONB,
  status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','waitlisted')),
  assigned_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vol_apps_event ON volunteer_applications(event_id, status);
CREATE INDEX IF NOT EXISTS idx_vol_apps_email ON volunteer_applications(event_id, email);

CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  task_id                   UUID NOT NULL REFERENCES volunteer_tasks(id) ON DELETE CASCADE,
  volunteer_application_id  UUID NOT NULL REFERENCES volunteer_applications(id) ON DELETE CASCADE,
  event_id                  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id                 UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status                    VARCHAR(20) DEFAULT 'assigned'
                              CHECK (status IN ('assigned','confirmed','checked_in','checked_out','cancelled','no_show')),
  checked_in_at             TIMESTAMPTZ,
  checked_out_at            TIMESTAMPTZ,
  checked_in_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, volunteer_application_id)
);

CREATE INDEX IF NOT EXISTS idx_vol_assign_task ON volunteer_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_vol_assign_app ON volunteer_assignments(volunteer_application_id);
CREATE INDEX IF NOT EXISTS idx_vol_assign_event ON volunteer_assignments(event_id, status);

CREATE TABLE IF NOT EXISTS volunteer_availability (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  volunteer_application_id  UUID NOT NULL REFERENCES volunteer_applications(id) ON DELETE CASCADE,
  day_of_week               INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time                TIME NOT NULL,
  end_time                  TIME NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vol_avail_app ON volunteer_availability(volunteer_application_id);

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'volunteer_tasks','volunteer_applications','volunteer_assignments','volunteer_availability'
  ]) LOOP
    EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;

INSERT INTO permissions (name, resource, action, description) VALUES
  ('volunteer.view','volunteer','view','View volunteers'),
  ('volunteer.manage','volunteer','manage','Manage volunteers'),
  ('volunteer.tasks_manage','volunteer','tasks_manage','Manage volunteer tasks'),
  ('volunteer.communicate','volunteer','communicate','Send communications to volunteers')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- DONE! All 21 migrations applied.
-- ================================================================

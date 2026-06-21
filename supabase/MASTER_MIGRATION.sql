-- ================================================================
-- HEYPASS — MASTER MIGRATION (011–020)
-- Run this ONE TIME in Supabase SQL Editor
-- Uses IF NOT EXISTS / IF EXISTS — safe to re-run
-- ================================================================

-- ================================================================
-- MIGRATION 011: WHITE LABEL BRANDING
-- ================================================================

CREATE TABLE IF NOT EXISTS client_branding (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_name            VARCHAR(255),
  tagline               VARCHAR(500),
  logo_url              VARCHAR(500),
  college_logo_url      VARCHAR(500),
  favicon_url           VARCHAR(500),
  default_banner_url    VARCHAR(500),
  primary_color         VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color       VARCHAR(7) DEFAULT '#1D4ED8',
  accent_color          VARCHAR(7) DEFAULT '#10B981',
  background_color      VARCHAR(7) DEFAULT '#FFFFFF',
  text_color            VARCHAR(7) DEFAULT '#1F2937',
  success_color         VARCHAR(7) DEFAULT '#10B981',
  warning_color         VARCHAR(7) DEFAULT '#F59E0B',
  error_color           VARCHAR(7) DEFAULT '#EF4444',
  font_family           VARCHAR(255) DEFAULT 'Inter, system-ui, sans-serif',
  font_heading_family   VARCHAR(255),
  border_radius         SMALLINT DEFAULT 8 CHECK (border_radius >= 0 AND border_radius <= 24),
  white_label_enabled   BOOLEAN DEFAULT FALSE,
  footer_text           TEXT,
  support_email         VARCHAR(255),
  support_phone         VARCHAR(50),
  social_links          JSONB DEFAULT '{}',
  email_from_name       VARCHAR(255),
  email_from_address    VARCHAR(255),
  email_reply_to        VARCHAR(255),
  footer_company_name   VARCHAR(255),
  footer_website_url    VARCHAR(500),
  footer_copyright      TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);
CREATE INDEX IF NOT EXISTS idx_branding_client ON client_branding(client_id);

CREATE TABLE IF NOT EXISTS event_branding (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  banner_url            VARCHAR(500),
  logo_url              VARCHAR(500),
  primary_color         VARCHAR(7),
  secondary_color       VARCHAR(7),
  accent_color          VARCHAR(7),
  background_color      VARCHAR(7),
  text_color            VARCHAR(7),
  custom_css            TEXT CHECK (length(custom_css) <= 10000),
  custom_head_html      TEXT CHECK (length(custom_head_html) <= 5000),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id)
);
CREATE INDEX IF NOT EXISTS idx_event_branding_event ON event_branding(event_id);
CREATE INDEX IF NOT EXISTS idx_event_branding_client ON event_branding(client_id);

CREATE TABLE IF NOT EXISTS client_email_templates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_key          VARCHAR(100) NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  subject               VARCHAR(500) NOT NULL,
  html_body             TEXT NOT NULL CHECK (length(html_body) <= 100000),
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  UNIQUE(client_id, template_key)
);
CREATE INDEX IF NOT EXISTS idx_email_templates_client ON client_email_templates(client_id, is_active) WHERE deleted_at IS NULL;

DO $$ BEGIN
  CREATE TRIGGER trigger_update_client_branding_updated_at BEFORE UPDATE ON client_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trigger_update_event_branding_updated_at BEFORE UPDATE ON event_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trigger_update_client_email_templates_updated_at BEFORE UPDATE ON client_email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE client_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_email_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "client_branding_select" ON client_branding FOR SELECT USING (client_id = get_client_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "client_branding_insert" ON client_branding FOR INSERT WITH CHECK (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "client_branding_update" ON client_branding FOR UPDATE USING (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "event_branding_select" ON event_branding FOR SELECT USING (client_id = get_client_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "event_branding_insert" ON event_branding FOR INSERT WITH CHECK (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin', 'manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "event_branding_update" ON event_branding FOR UPDATE USING (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin', 'manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "email_templates_select" ON client_email_templates FOR SELECT USING (client_id = get_client_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "email_templates_insert" ON client_email_templates FOR INSERT WITH CHECK (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "email_templates_update" ON client_email_templates FOR UPDATE USING (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "email_templates_delete" ON client_email_templates FOR DELETE USING (client_id = get_client_id() AND get_user_role() IN ('owner', 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- MIGRATION 012: REGISTRATION BUILDER
-- ================================================================

CREATE TABLE IF NOT EXISTS form_sections (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id                 UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  title                   VARCHAR(255) NOT NULL DEFAULT 'Untitled Section',
  description             TEXT,
  sort_order              INT DEFAULT 0,
  is_collapsible          BOOLEAN DEFAULT FALSE,
  is_collapsed_default    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_sections_form ON form_sections(form_id);

CREATE TABLE IF NOT EXISTS form_templates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id               UUID REFERENCES clients(id) ON DELETE CASCADE,
  name                    VARCHAR(255) NOT NULL,
  description             TEXT,
  category                VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (category IN ('conference', 'workshop', 'meetup', 'webinar', 'custom')),
  fields_config           JSONB NOT NULL DEFAULT '[]',
  sections_config         JSONB NOT NULL DEFAULT '[]',
  is_system               BOOLEAN DEFAULT FALSE,
  is_public               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_form_templates_category ON form_templates(category, is_public) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_client ON form_templates(client_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS form_analytics (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id                 UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date                    DATE NOT NULL DEFAULT CURRENT_DATE,
  views                   INT DEFAULT 0,
  starts                  INT DEFAULT 0,
  field_views             JSONB DEFAULT '{}',
  completions             INT DEFAULT 0,
  errors                  INT DEFAULT 0,
  avg_time_seconds        INT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form_id, date)
);
CREATE INDEX IF NOT EXISTS idx_form_analytics_form ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_date ON form_analytics(date);

ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES form_sections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_fields_section ON form_fields(section_id);
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS default_value TEXT;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS help_text VARCHAR(500);
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS is_readonly BOOLEAN DEFAULT FALSE;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS conditional_required JSONB;

ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;
ALTER TABLE form_fields ADD CONSTRAINT form_fields_field_type_check
  CHECK (field_type IN ('text','email','phone','number','textarea','select','checkbox','radio','date','file','country','state','heading','paragraph','divider'));

ALTER TABLE registration_forms ADD COLUMN IF NOT EXISTS is_multi_step BOOLEAN DEFAULT FALSE;
ALTER TABLE registration_forms ADD COLUMN IF NOT EXISTS steps_config JSONB DEFAULT '[]';

ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "form_sections_select" ON form_sections FOR SELECT USING (form_id IN (SELECT rf.id FROM registration_forms rf WHERE rf.client_id = get_client_id())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_sections_insert" ON form_sections FOR INSERT WITH CHECK (form_id IN (SELECT rf.id FROM registration_forms rf WHERE rf.client_id = get_client_id() AND get_user_role() IN ('owner','admin','manager'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_sections_update" ON form_sections FOR UPDATE USING (form_id IN (SELECT rf.id FROM registration_forms rf WHERE rf.client_id = get_client_id() AND get_user_role() IN ('owner','admin','manager'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_sections_delete" ON form_sections FOR DELETE USING (form_id IN (SELECT rf.id FROM registration_forms rf WHERE rf.client_id = get_client_id() AND get_user_role() IN ('owner','admin','manager'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_templates_select" ON form_templates FOR SELECT USING (is_public = TRUE OR client_id = get_client_id() OR client_id IS NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_templates_insert" ON form_templates FOR INSERT WITH CHECK (client_id = get_client_id() AND get_user_role() IN ('owner','admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_templates_update" ON form_templates FOR UPDATE USING (client_id = get_client_id() AND get_user_role() IN ('owner','admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_templates_delete" ON form_templates FOR DELETE USING (client_id = get_client_id() AND get_user_role() IN ('owner','admin') AND is_system = FALSE); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_analytics_select" ON form_analytics FOR SELECT USING (client_id = get_client_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_analytics_insert" ON form_analytics FOR INSERT WITH CHECK (client_id = get_client_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "form_analytics_update" ON form_analytics FOR UPDATE USING (client_id = get_client_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- MIGRATION 013: PAYMENT, PRICING & MANUAL CERTS
-- ================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  method_type         VARCHAR(20) NOT NULL CHECK (method_type IN ('bank_account', 'upi')),
  bank_name           VARCHAR(255),
  account_holder_name VARCHAR(255) NOT NULL,
  account_number      VARCHAR(30),
  ifsc_code           VARCHAR(15),
  branch_name         VARCHAR(255),
  upi_id              VARCHAR(100),
  upi_qr_url          VARCHAR(500),
  is_active           BOOLEAN DEFAULT TRUE,
  display_order       INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT chk_payment_type CHECK (
    (method_type = 'bank_account' AND account_number IS NOT NULL AND ifsc_code IS NOT NULL)
    OR (method_type = 'upi' AND upi_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_client ON payment_methods(client_id, is_active) WHERE deleted_at IS NULL;

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_method_ids UUID[] DEFAULT '{}';

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS max_capacity INT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS registrations_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id     UUID REFERENCES registrations(id) ON DELETE SET NULL,
  session_id          UUID REFERENCES sessions(id) ON DELETE SET NULL,
  payment_method_id   UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_ref     VARCHAR(255),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS manual_data JSONB;

CREATE TABLE IF NOT EXISTS session_attendance (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_registered  INT DEFAULT 0,
  total_checked_in  INT DEFAULT 0,
  total_checked_out INT DEFAULT 0,
  last_check_in_at  TIMESTAMPTZ,
  last_check_out_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_session_attendance_event ON session_attendance(event_id);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "payment_methods_isolation" ON payment_methods FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payment_methods_service" ON payment_methods FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payments_isolation" ON payments FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payments_service" ON payments FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "session_attendance_isolation" ON session_attendance FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "session_attendance_service" ON session_attendance FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- MIGRATION 014: QR SECURITY
-- ================================================================

CREATE TABLE IF NOT EXISTS qr_nonces (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  nonce         VARCHAR(64) UNIQUE NOT NULL,
  hmac_signature VARCHAR(64) NOT NULL,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  used_at       TIMESTAMPTZ,
  used_by_station UUID,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_nonces_ticket ON qr_nonces(ticket_id, is_active);
CREATE INDEX IF NOT EXISTS idx_qr_nonces_nonce ON qr_nonces(nonce) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_qr_nonces_expires ON qr_nonces(expires_at) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS qr_scan_attempts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id         UUID REFERENCES tickets(id) ON DELETE SET NULL,
  nonce             VARCHAR(64),
  station_id        UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  staff_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  scan_result       VARCHAR(20) NOT NULL CHECK (scan_result IN ('success', 'duplicate', 'expired', 'invalid', 'fraud_suspected')),
  ip_address        INET,
  device_id         VARCHAR(100),
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  qr_payload        JSONB,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_attempts_event ON qr_scan_attempts(event_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_attempts_ticket ON qr_scan_attempts(ticket_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_attempts_station ON qr_scan_attempts(station_id, scanned_at DESC);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qr_version INT DEFAULT 1;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qr_last_rotated_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qr_rotation_count INT DEFAULT 0;

ALTER TABLE qr_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "qr_nonces_service" ON qr_nonces FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_scan_attempts_isolation" ON qr_scan_attempts FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_scan_attempts_service" ON qr_scan_attempts FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- MIGRATION 015: GATE MANAGEMENT
-- ================================================================

DO $$ BEGIN
  CREATE TYPE gate_type AS ENUM ('main_entrance', 'session_gate', 'exit_gate', 'vip_lane');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS gate_sessions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id   UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gate_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_gate_sessions_gate ON gate_sessions(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_sessions_session ON gate_sessions(session_id);

CREATE TABLE IF NOT EXISTS gate_staff (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id       UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) DEFAULT 'scanner' CHECK (role IN ('scanner', 'supervisor', 'admin')),
  shift_start   TIMESTAMPTZ,
  shift_end     TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  assigned_at   TIMESTAMPTZ DEFAULT now(),
  assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(gate_id, staff_id)
);
CREATE INDEX IF NOT EXISTS idx_gate_staff_gate ON gate_staff(gate_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gate_staff_staff ON gate_staff(staff_id, is_active);

CREATE TABLE IF NOT EXISTS gate_stats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id             UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_scans         INT DEFAULT 0,
  successful_checkins INT DEFAULT 0,
  successful_checkouts INT DEFAULT 0,
  duplicates_blocked  INT DEFAULT 0,
  invalid_rejected    INT DEFAULT 0,
  fraud_suspected     INT DEFAULT 0,
  avg_scan_time_ms    INT DEFAULT 0,
  peak_scans_per_min  INT DEFAULT 0,
  last_scan_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gate_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_gate_stats_event ON gate_stats(event_id);

CREATE TABLE IF NOT EXISTS staff_shifts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  staff_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gate_id       UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shift_start   TIMESTAMPTZ NOT NULL,
  shift_end     TIMESTAMPTZ,
  total_scans   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id, shift_start DESC);

CREATE TABLE IF NOT EXISTS attendance_rules (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id                      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id                     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  require_checkout              BOOLEAN DEFAULT FALSE,
  min_duration_minutes          INT,
  min_sessions_attended         INT,
  required_session_ids          UUID[],
  duration_percentage_threshold DECIMAL(5,2),
  auto_checkout_enabled         BOOLEAN DEFAULT TRUE,
  auto_checkout_grace_minutes   INT DEFAULT 60,
  created_at                    TIMESTAMPTZ DEFAULT now(),
  updated_at                    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id)
);

ALTER TABLE check_in_stations ADD COLUMN IF NOT EXISTS gate_type VARCHAR(20) DEFAULT 'main_entrance';
ALTER TABLE check_in_stations ADD COLUMN IF NOT EXISTS max_scans_per_min INT DEFAULT 60;
ALTER TABLE check_in_stations ADD COLUMN IF NOT EXISTS assigned_sessions UUID[] DEFAULT '{}';
ALTER TABLE check_in_stations ADD COLUMN IF NOT EXISTS auto_checkout_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE gate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "gate_sessions_service" ON gate_sessions FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "gate_staff_service" ON gate_staff FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "gate_stats_service" ON gate_stats FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "staff_shifts_service" ON staff_shifts FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "attendance_rules_service" ON attendance_rules FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- MIGRATION 016: CERTIFICATE SECURITY FIXES
-- ================================================================

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_snapshot JSONB;
CREATE INDEX IF NOT EXISTS idx_cert_content_hash ON certificates(content_hash);

CREATE TABLE IF NOT EXISTS certificate_downloads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  ip_address        INET NOT NULL,
  user_agent        TEXT,
  download_type     VARCHAR(20) NOT NULL CHECK (download_type IN ('pdf', 'png', 'zip')),
  downloaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_downloads_cert ON certificate_downloads(certificate_id, downloaded_at DESC);

CREATE TABLE IF NOT EXISTS certificate_generation_limits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  generated_count   INT DEFAULT 1,
  window_start      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, event_id, window_start)
);

CREATE TABLE IF NOT EXISTS certificate_share_links (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  token             VARCHAR(64) UNIQUE NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  access_count      INT DEFAULT 0,
  max_access        INT DEFAULT 100,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_share_token ON certificate_share_links(token);


-- ================================================================
-- MIGRATION 017: NOTIFICATIONS
-- ================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL CHECK (type IN ('registration', 'payment', 'certificate', 'reminder', 'marketing', 'checkin', 'custom')),
  name          VARCHAR(255) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  body          TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  variables     JSONB,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notif_templates_client ON notification_templates(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_templates_event ON notification_templates(event_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID REFERENCES events(id) ON DELETE SET NULL,
  recipient_email     VARCHAR(255) NOT NULL,
  recipient_name      VARCHAR(255),
  type                VARCHAR(50) NOT NULL,
  subject             VARCHAR(500) NOT NULL,
  body                TEXT,
  status              VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'failed')),
  template_id         UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  metadata            JSONB,
  error_message       TEXT,
  sendgrid_message_id VARCHAR(100),
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  opened_at           TIMESTAMPTZ,
  clicked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email_enabled       BOOLEAN DEFAULT TRUE,
  marketing_enabled   BOOLEAN DEFAULT TRUE,
  reminder_enabled    BOOLEAN DEFAULT TRUE,
  certificate_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, client_id)
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  notification_id   UUID REFERENCES notifications(id) ON DELETE CASCADE,
  priority          INT DEFAULT 0,
  scheduled_at      TIMESTAMPTZ DEFAULT now(),
  attempts          INT DEFAULT 0,
  max_attempts      INT DEFAULT 3,
  status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_error        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  processed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON notification_queue(scheduled_at, priority DESC) WHERE status = 'pending';


-- ================================================================
-- MIGRATION 018: INTEGRATIONS
-- ================================================================

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'full' CHECK (scope IN ('full', 'event', 'read_only', 'webhook'));
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit INT DEFAULT 1000;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS ip_whitelist INET[];
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_ip INET;
CREATE INDEX IF NOT EXISTS idx_apikeys_event ON api_keys(event_id) WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url               VARCHAR(500) NOT NULL,
  description       TEXT,
  events            JSONB NOT NULL DEFAULT '[]',
  secret            VARCHAR(64) NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count     INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_webhooks_client ON webhook_endpoints(client_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  response_code   INT,
  response_body   TEXT,
  attempts        INT DEFAULT 0,
  max_attempts    INT DEFAULT 3,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id, created_at DESC);

CREATE TABLE IF NOT EXISTS registration_links (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  short_code          VARCHAR(20) UNIQUE NOT NULL,
  utm_source          VARCHAR(100),
  utm_medium          VARCHAR(100),
  utm_campaign        VARCHAR(100),
  click_count         INT DEFAULT 0,
  registration_count  INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reglinks_code ON registration_links(short_code);
CREATE INDEX IF NOT EXISTS idx_reglinks_event ON registration_links(event_id);


-- ================================================================
-- MIGRATION 019: BILLING SCHEMA
-- ================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name                VARCHAR(100) NOT NULL,
  slug                VARCHAR(50) UNIQUE NOT NULL,
  price_monthly       DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_annual        DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate     DECIMAL(5,2) NOT NULL DEFAULT 2.5,
  max_events          INT NOT NULL DEFAULT 3,
  max_registrations   INT NOT NULL DEFAULT 100,
  max_team_members    INT NOT NULL DEFAULT 5,
  features            JSONB DEFAULT '[]',
  is_active           BOOLEAN DEFAULT TRUE,
  display_order       INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id               UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle         VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  status                VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial', 'paused')),
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end    TIMESTAMPTZ NOT NULL,
  trial_end             TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON client_subscriptions(client_id);

CREATE TABLE IF NOT EXISTS payment_gateway_config (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider                VARCHAR(20) NOT NULL CHECK (provider IN ('razorpay', 'cashfree')),
  api_key_encrypted       TEXT,
  api_secret_encrypted    TEXT,
  webhook_secret_encrypted TEXT,
  is_live                 BOOLEAN DEFAULT FALSE,
  is_active               BOOLEAN DEFAULT TRUE,
  verified_at             TIMESTAMPTZ,
  last_webhook_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, provider)
);

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  invoice_number      VARCHAR(50) UNIQUE NOT NULL,
  type                VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'commission', 'refund', 'credit')),
  status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_amount   DECIMAL(10,2) DEFAULT 0,
  gst_amount          DECIMAL(10,2) DEFAULT 0,
  total               DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(3) DEFAULT 'INR',
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  due_date            DATE,
  paid_at             TIMESTAMPTZ,
  payment_method      VARCHAR(50),
  payment_reference   VARCHAR(100),
  pdf_url             VARCHAR(500),
  notes               TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, due_date);

CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   VARCHAR(500) NOT NULL,
  quantity      INT DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS commissions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID REFERENCES events(id) ON DELETE SET NULL,
  invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_id      VARCHAR(100),
  transaction_amount  DECIMAL(10,2) NOT NULL,
  commission_rate     DECIMAL(5,2) NOT NULL,
  commission_amount   DECIMAL(10,2) NOT NULL,
  gst_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_payout          DECIMAL(10,2) NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'refunded')),
  transaction_at      TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commissions_client ON commissions(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gateway         VARCHAR(20) NOT NULL,
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  processed       BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  idempotency_key VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_webhooks_client ON billing_webhook_events(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fraud_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_type   VARCHAR(50) NOT NULL CHECK (rule_type IN ('velocity', 'amount', 'duplicate', 'pattern')),
  config      JSONB NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_client ON fraud_rules(client_id);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  commission_id UUID REFERENCES commissions(id) ON DELETE SET NULL,
  rule_type     VARCHAR(50) NOT NULL,
  severity      VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description   TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'flagged')),
  reviewed_by   UUID REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_client ON fraud_alerts(client_id, created_at DESC);

-- Seed plans (ignore if already exists)
INSERT INTO subscription_plans (name, slug, price_monthly, price_annual, commission_rate, max_events, max_registrations, max_team_members, features, display_order) VALUES
  ('Free', 'free', 0, 0, 0.5, 3, 100, 5, '["basic_events","basic_certificates","email_support"]', 1),
  ('Starter', 'starter', 999, 7992, 2.0, 10, 1000, 10, '["all_events","all_certificates","white_label","analytics"]', 2),
  ('Professional', 'professional', 2999, 23992, 1.5, 50, 10000, 25, '["all_events","all_certificates","white_label","analytics","api_access","webhooks"]', 3),
  ('Enterprise', 'enterprise', 9999, 79992, 1.0, -1, -1, -1, '["unlimited","all_features","sla","account_manager"]', 4)
ON CONFLICT (slug) DO NOTHING;


-- ================================================================
-- MIGRATION 020: SINGLE EVENT PLANS
-- ================================================================

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'subscription' CHECK (type IN ('subscription', 'single_event'));
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_per_event DECIMAL(10,2) DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS event_registration_limit INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS event_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES subscription_plans(id),
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  purchased_at        TIMESTAMPTZ DEFAULT now(),
  expires_at          TIMESTAMPTZ,
  registration_limit  INT NOT NULL DEFAULT 0,
  registrations_used  INT NOT NULL DEFAULT 0,
  amount_paid         DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_reference   VARCHAR(100),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_subs_client ON event_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_event_subs_event ON event_subscriptions(event_id);

INSERT INTO subscription_plans (name, slug, type, price_per_event, event_registration_limit, commission_rate, max_events, max_registrations, max_team_members, features, display_order) VALUES
  ('Event Starter', 'event-starter', 'single_event', 199, 100, 2.5, 1, 100, 5, '["basic_certificates","analytics"]', 10),
  ('Event Pro', 'event-pro', 'single_event', 499, 500, 2.0, 1, 500, 10, '["all_certificates","analytics","white_label"]', 11),
  ('Event Enterprise', 'event-enterprise', 'single_event', 999, 5000, 1.5, 1, 5000, 25, '["all_certificates","analytics","white_label","custom_domain"]', 12)
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- DONE! All migrations 011-020 applied.
-- ================================================================

-- ================================================================
-- MIGRATION FIX ALL
-- Comprehensive patch for COMPLETE_MIGRATION.sql
-- Run this AFTER COMPLETE_MIGRATION.sql (safe to re-run)
-- Uses CREATE OR REPLACE, IF NOT EXISTS, ON CONFLICT DO NOTHING
-- ================================================================

-- ================================================================
-- PART 1: MISSING TABLES
-- ================================================================

-- Event templates (003)
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Event venues join (003)
CREATE TABLE IF NOT EXISTS event_venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, venue_id)
);

-- Event co-hosts (003)
CREATE TABLE IF NOT EXISTS event_co_hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  website VARCHAR(500),
  role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event tags (003)
CREATE TABLE IF NOT EXISTS event_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, tag)
);

-- Ticket types (004)
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  capacity INT,
  tickets_sold INT DEFAULT 0,
  max_per_order INT DEFAULT 5,
  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Registration responses (004)
CREATE TABLE IF NOT EXISTS registration_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coupon usage (004)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Staff shifts (015)
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gate_id UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ,
  total_scans INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Offline sync queue (005)
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  action VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  error TEXT
);

-- Certificate deliveries (006)
CREATE TABLE IF NOT EXISTS certificate_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Regeneration usage (006)
CREATE TABLE IF NOT EXISTS regeneration_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  regenerated_at TIMESTAMPTZ DEFAULT now(),
  new_template_version INT,
  old_pdf_url VARCHAR(500),
  new_pdf_url VARCHAR(500)
);

-- ZIP export jobs (006)
CREATE TABLE IF NOT EXISTS zip_export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  certificate_type UUID REFERENCES certificate_types(id) ON DELETE SET NULL,
  total_certificates INT DEFAULT 0,
  zip_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  download_links JSONB,
  job_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Verification rate limits (006)
CREATE TABLE IF NOT EXISTS verification_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ip_address INET NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT DEFAULT 0,
  captcha_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Verification CAPTCHA sessions (006)
CREATE TABLE IF NOT EXISTS verification_captcha_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ip_address INET NOT NULL,
  captcha_token VARCHAR(255),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Form templates (012)
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  fields_config JSONB,
  sections_config JSONB,
  is_system BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Form analytics (012)
CREATE TABLE IF NOT EXISTS form_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  starts INT DEFAULT 0,
  completions INT DEFAULT 0,
  errors INT DEFAULT 0,
  avg_time_seconds NUMERIC(10,2),
  field_views JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form_id, date)
);

-- Invoice items (019)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Billing webhook events (019)
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gateway VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client email templates (011)
CREATE TABLE IF NOT EXISTS client_email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(client_id, template_key)
);

-- ================================================================
-- PART 2: MISSING COLUMNS ON EXISTING TABLES
-- ================================================================

-- Coupons: add missing columns
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount_amount DECIMAL(10,2);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Waitlists: add missing columns
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Tickets: add missing columns
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS check_in_station_id UUID;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transferred_to UUID;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transfer_count INT DEFAULT 0;

-- Notifications: widen status check and add missing columns
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('queued','sending','sent','delivered','opened','clicked','failed'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sendgrid_message_id VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Form fields: add CHECK constraint for field_type
ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;
ALTER TABLE form_fields ADD CONSTRAINT form_fields_field_type_check
  CHECK (field_type IN ('text','email','phone','number','textarea','select','checkbox','radio','date','file','country','state','heading','paragraph','divider'));

-- Offline scans: add conflict_resolution column
ALTER TABLE offline_scans ADD COLUMN IF NOT EXISTS conflict_resolution VARCHAR(20)
  CHECK (conflict_resolution IN ('server_wins','client_wins','merged'));

-- Payment methods: add CHECK constraint
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS chk_payment_type;
ALTER TABLE payment_methods ADD CONSTRAINT chk_payment_type
  CHECK (method_type IN ('bank_account','upi'));

-- Subscription plans: remove duplicate price_yearly if both exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_yearly') THEN
    ALTER TABLE subscription_plans DROP COLUMN price_yearly;
  END IF;
END $$;

-- ================================================================
-- PART 3: MISSING FUNCTIONS
-- ================================================================

-- Generate certificate number from sequence
CREATE OR REPLACE FUNCTION generate_certificate_number(p_client_id UUID)
RETURNS VARCHAR(50) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year INT;
  v_seq INT;
  v_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM now())::INT;
  INSERT INTO certificate_sequences (client_id, year, last_sequence)
  VALUES (p_client_id, v_year, 1)
  ON CONFLICT (client_id, year) DO UPDATE SET last_sequence = certificate_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  v_number := 'CERT-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0') || '-' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
  RETURN v_number;
END;
$$;

-- Seed role-permission mappings (from 009)
CREATE OR REPLACE FUNCTION seed_role_permissions(p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id UUID; v_admin_id UUID; v_manager_id UUID; v_volunteer_id UUID; v_scanner_id UUID;
BEGIN
  SELECT id INTO v_owner_id   FROM roles WHERE client_id = p_client_id AND slug = 'owner'   AND deleted_at IS NULL;
  SELECT id INTO v_admin_id   FROM roles WHERE client_id = p_client_id AND slug = 'admin'   AND deleted_at IS NULL;
  SELECT id INTO v_manager_id FROM roles WHERE client_id = p_client_id AND slug = 'manager' AND deleted_at IS NULL;
  SELECT id INTO v_volunteer_id FROM roles WHERE client_id = p_client_id AND slug = 'volunteer' AND deleted_at IS NULL;
  SELECT id INTO v_scanner_id FROM roles WHERE client_id = p_client_id AND slug = 'scanner' AND deleted_at IS NULL;
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_owner_id, id FROM permissions;
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_admin_id, id FROM permissions
  WHERE name NOT IN ('user.impersonate','roles.create','roles.delete','client.delete','billing.plan_change','billing.cancel');
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_manager_id, id FROM permissions
  WHERE name IN ('client.view','users.view','users.invite','roles.view',
    'events.view','events.create','events.edit','events.publish','events.close','events.clone',
    'event.manage_staff','event.configure_branding',
    'sessions.view','sessions.create','sessions.edit',
    'registrations.view','registrations.create','registrations.edit','registrations.export',
    'registration.approve','registration.cancel',
    'registration.waitlist_view','registration.waitlist_promote',
    'coupon.create','coupon.view',
    'tickets.view','tickets.validate','tickets.scan',
    'ticket.scan','ticket.checkout','ticket.override',
    'checkin.perform','checkin.view','checkin.override','checkin.export','checkin.offline_upload',
    'checkout.perform','checkout.view','checkout.manual','checkout.export','checkout.auto_configure',
    'attendance.view','attendance.export',
    'certificates.view','certificates.generate','certificates.download','certificates.templates',
    'certificate.regenerate','certificate.export','certificate.verify','certificate.upload_assets',
    'verification.configure','verification.logs_view',
    'theme.view','theme.edit',
    'analytics.view','analytics.export',
    'settings.view','settings.edit',
    'audit.view',
    'email.template_view','email.template_manage',
    'webhook.view','webhook.manage',
    'volunteer.view','volunteer.tasks_manage');
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_volunteer_id, id FROM permissions
  WHERE name IN ('events.view','sessions.view','registrations.view',
    'tickets.view','ticket.scan','ticket.checkout',
    'checkin.perform','checkin.view',
    'checkout.perform','checkout.view',
    'attendance.view','certificates.view');
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_scanner_id, id FROM permissions
  WHERE name IN ('ticket.scan','ticket.checkout','checkin.perform','checkout.perform');
END;
$$;

CREATE OR REPLACE FUNCTION trigger_seed_role_permissions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_role_permissions(NEW.id);
  RETURN NEW;
END;
$$;

-- Session attendance update on check-in
CREATE OR REPLACE FUNCTION update_session_attendance_checkin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO session_attendance (session_id, event_id, client_id, total_checked_in)
  VALUES (NEW.session_id, NEW.event_id, NEW.client_id, 1)
  ON CONFLICT (session_id) DO UPDATE SET
    total_checked_in = session_attendance.total_checked_in + 1;
  RETURN NEW;
END;
$$;

-- Session attendance update on check-out
CREATE OR REPLACE FUNCTION update_session_attendance_checkout()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID;
BEGIN
  SELECT session_id INTO v_session_id FROM check_ins WHERE id = NEW.check_in_id;
  IF v_session_id IS NOT NULL THEN
    UPDATE session_attendance
    SET total_checked_out = total_checked_out + 1, last_check_out_at = NOW()
    WHERE session_id = v_session_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Gate stats update on scan
CREATE OR REPLACE FUNCTION update_gate_stats_on_scan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO gate_stats (gate_id, event_id, client_id, total_scans, successful_checkins, last_scan_at)
  VALUES (NEW.station_id, NEW.event_id, NEW.client_id, 1, 1, NOW())
  ON CONFLICT (gate_id, event_id) DO UPDATE SET
    total_scans = gate_stats.total_scans + 1,
    successful_checkins = gate_stats.successful_checkins + 1,
    last_scan_at = NOW();
  RETURN NEW;
END;
$$;

-- Gate stats update on fraud (FIXED: no exponential growth)
CREATE OR REPLACE FUNCTION update_gate_stats_on_fraud()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO gate_stats (gate_id, event_id, client_id, total_scans, duplicates_blocked, fraud_suspected, last_scan_at)
  VALUES (
    NEW.station_id, NEW.event_id, NEW.client_id, 1,
    CASE WHEN NEW.scan_result = 'duplicate' THEN 1 ELSE 0 END,
    CASE WHEN NEW.scan_result = 'fraud_suspected' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (gate_id, event_id) DO UPDATE SET
    total_scans = gate_stats.total_scans + 1,
    duplicates_blocked = gate_stats.duplicates_blocked + CASE WHEN NEW.scan_result = 'duplicate' THEN 1 ELSE 0 END,
    fraud_suspected = gate_stats.fraud_suspected + CASE WHEN NEW.scan_result = 'fraud_suspected' THEN 1 ELSE 0 END,
    last_scan_at = NOW();
  RETURN NEW;
END;
$$;

-- QR rotation: increment counter and deactivate old nonces
CREATE OR REPLACE FUNCTION update_qr_rotation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE tickets SET qr_rotation_count = qr_rotation_count + 1, qr_last_rotated_at = NOW() WHERE id = NEW.ticket_id;
  UPDATE qr_nonces SET is_active = FALSE WHERE ticket_id = NEW.ticket_id AND id != NEW.id;
  RETURN NEW;
END;
$$;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_client_id UUID)
RETURNS VARCHAR(50) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year INT; v_seq INT; v_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM now())::INT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INT)), 0) + 1 INTO v_seq
  FROM invoices WHERE invoice_number LIKE 'INV-' || v_year || '-%';
  v_number := 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_number;
END;
$$;

-- Calculate commission with GST
CREATE OR REPLACE FUNCTION calculate_commission(p_amount DECIMAL, p_rate DECIMAL)
RETURNS TABLE(commission_amount DECIMAL, gst_amount DECIMAL, net_payout DECIMAL) LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  commission_amount := ROUND(p_amount * p_rate / 100, 2);
  gst_amount := ROUND(commission_amount * 18 / 100, 2);
  net_payout := p_amount - commission_amount - gst_amount;
  RETURN NEXT;
END;
$$;

-- Check certificate generation limit
CREATE OR REPLACE FUNCTION check_cert_generation_limit(p_client_id UUID, p_hard_limit INT DEFAULT 500)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COALESCE(SUM(generated_count), 0) INTO v_count
  FROM certificate_generation_limits
  WHERE client_id = p_client_id AND window_start > NOW() - INTERVAL '1 hour';
  RETURN v_count < p_hard_limit;
END;
$$;

-- Check certificate download limit
CREATE OR REPLACE FUNCTION check_cert_download_limit(p_ip INET, p_hard_limit INT DEFAULT 10)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM certificate_downloads
  WHERE ip_address = p_ip AND downloaded_at > NOW() - INTERVAL '1 hour';
  RETURN v_count < p_hard_limit;
END;
$$;

-- Calculate attendance
CREATE OR REPLACE FUNCTION calculate_attendance(p_registration_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event_id UUID; v_check_in TIMESTAMPTZ; v_check_out TIMESTAMPTZ;
  v_duration INT; v_event_duration INT; v_percentage NUMERIC;
  v_eligible BOOLEAN; v_reason TEXT;
BEGIN
  SELECT event_id, checked_in_at, checked_out_at INTO v_event_id, v_check_in, v_check_out
  FROM registrations WHERE id = p_registration_id;
  IF v_check_in IS NULL THEN RETURN; END IF;
  v_check_out := COALESCE(v_check_out, NOW());
  v_duration := EXTRACT(EPOCH FROM (v_check_out - v_check_in)) / 60;
  SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / 60 INTO v_event_duration
  FROM events WHERE id = v_event_id;
  v_percentage := CASE WHEN v_event_duration > 0 THEN ROUND((v_duration::NUMERIC / v_event_duration) * 100, 2) ELSE 0 END;
  v_eligible := v_percentage >= 50;
  v_reason := CASE WHEN v_eligible THEN 'meets threshold' ELSE 'below 50% threshold' END;
  INSERT INTO attendance_summary (client_id, event_id, registration_id, check_in_time, check_out_time, duration_minutes, attendance_percentage, is_eligible, eligibility_reason, last_calculated_at)
  SELECT COALESCE((SELECT client_id FROM events WHERE id = v_event_id), '00000000-0000-0000-0000-000000000000'),
    v_event_id, p_registration_id, v_check_in, v_check_out, v_duration, v_percentage, v_eligible, v_reason, NOW()
  ON CONFLICT (registration_id) DO UPDATE SET
    check_in_time = v_check_in, check_out_time = v_check_out, duration_minutes = v_duration,
    attendance_percentage = v_percentage, is_eligible = v_eligible, eligibility_reason = v_reason, last_calculated_at = NOW();
END;
$$;

-- Auto-checkout
CREATE OR REPLACE FUNCTION auto_checkout_event(p_event_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE registrations SET checked_out_at = NOW()
  WHERE event_id = p_event_id AND checked_in_at IS NOT NULL AND checked_out_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- API key generation
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'hp_' || encode(gen_random_bytes(32), 'hex');
$$;

-- Hash API key
CREATE OR REPLACE FUNCTION hash_api_key(p_key TEXT)
RETURNS TEXT LANGUAGE SQL AS $$
  SELECT encode(sha256(p_key::bytea), 'hex');
$$;

-- Generate short code
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS VARCHAR(20) LANGUAGE SQL AS $$
  SELECT substring(replace(encode(gen_random_bytes(6), 'base64'), '/', '0') from 1 for 8);
$$;

-- Count sync for session registrations
CREATE OR REPLACE FUNCTION sync_session_registrations_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sessions SET registrations_count = registrations_count + 1 WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sessions SET registrations_count = GREATEST(registrations_count - 1, 0) WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$;

-- ================================================================
-- PART 4: MISSING TRIGGERS
-- ================================================================

-- Drop existing triggers first to avoid duplicates
DROP TRIGGER IF EXISTS trg_checkin_session_attendance ON check_ins;
DROP TRIGGER IF EXISTS trg_checkout_session_attendance ON check_outs;
DROP TRIGGER IF EXISTS trg_update_gate_stats ON check_ins;
DROP TRIGGER IF EXISTS trg_update_gate_fraud_stats ON qr_scan_attempts;
DROP TRIGGER IF EXISTS trg_qr_rotation ON qr_nonces;
DROP TRIGGER IF EXISTS after_client_insert_role_perms ON clients;
DROP TRIGGER IF EXISTS trg_sync_session_registrations ON registrations;

CREATE TRIGGER trg_checkin_session_attendance AFTER INSERT ON check_ins
  FOR EACH ROW WHEN (NEW.session_id IS NOT NULL) EXECUTE FUNCTION update_session_attendance_checkin();
CREATE TRIGGER trg_checkout_session_attendance AFTER INSERT ON check_outs
  FOR EACH ROW EXECUTE FUNCTION update_session_attendance_checkout();
CREATE TRIGGER trg_update_gate_stats AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION update_gate_stats_on_scan();
CREATE TRIGGER trg_update_gate_fraud_stats AFTER INSERT ON qr_scan_attempts
  FOR EACH ROW EXECUTE FUNCTION update_gate_stats_on_fraud();
CREATE TRIGGER trg_qr_rotation AFTER INSERT ON qr_nonces
  FOR EACH ROW EXECUTE FUNCTION update_qr_rotation();
CREATE TRIGGER after_client_insert_role_perms AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION trigger_seed_role_permissions();
CREATE TRIGGER trg_sync_session_registrations AFTER INSERT OR DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION sync_session_registrations_count();

-- ================================================================
-- PART 5: AUDIT LOG PARTITIONS (2025-2027)
-- Only runs if audit_logs is already partitioned; otherwise skip
-- ================================================================

DO $$ DECLARE
  v_year INT; v_month INT; v_start DATE; v_end DATE;
  v_part_name TEXT;
  v_is_partitioned BOOLEAN;
BEGIN
  SELECT relkind = 'p' INTO v_is_partitioned
  FROM pg_class WHERE relname = 'audit_logs';

  IF NOT v_is_partitioned THEN
    RAISE NOTICE 'audit_logs is not partitioned — skipping partition creation';
    RETURN;
  END IF;

  FOR v_year IN 2025..2027 LOOP
    FOR v_month IN 1..12 LOOP
      v_start := TO_DATE(v_year || '-' || v_month || '-01', 'YYYY-MM-DD');
      v_end := v_start + INTERVAL '1 month';
      v_part_name := 'audit_logs_' || v_year || '_' || LPAD(v_month::TEXT, 2, '0');
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_part_name) THEN
        EXECUTE 'CREATE TABLE ' || v_part_name || ' PARTITION OF audit_logs FOR VALUES FROM (''' || v_start || ''') TO (''' || v_end || ''')';
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ================================================================
-- PART 6: MISSING VIEWS
-- ================================================================

CREATE OR REPLACE VIEW event_ticket_summary AS
SELECT e.id AS event_id, e.title, e.client_id,
  COUNT(DISTINCT t.id) AS total_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'used') AS used_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'cancelled') AS cancelled_tickets,
  COUNT(DISTINCT r.id) AS total_registrations,
  COUNT(DISTINCT p.id) AS total_payments,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS revenue
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id AND r.deleted_at IS NULL
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN payments p ON p.event_id = e.id
GROUP BY e.id, e.title, e.client_id;

CREATE OR REPLACE VIEW live_session_attendance AS
SELECT s.id AS session_id, s.title, s.event_id, s.client_id,
  COALESCE(sa.total_checked_in, 0) AS total_checked_in,
  COALESCE(sa.total_checked_out, 0) AS total_checked_out,
  CASE WHEN s.max_capacity > 0
    THEN ROUND((COALESCE(sa.total_checked_in, 0)::NUMERIC / s.max_capacity) * 100, 1)
    ELSE 0 END AS attendance_percentage
FROM sessions s
LEFT JOIN session_attendance sa ON sa.session_id = s.id;

CREATE OR REPLACE VIEW gate_performance AS
SELECT cs.id AS gate_id, cs.name, cs.gate_type, cs.event_id, cs.client_id,
  COALESCE(gs.total_scans, 0) AS total_scans,
  COALESCE(gs.successful_checkins, 0) AS successful_checkins,
  COALESCE(gs.successful_checkouts, 0) AS successful_checkouts,
  COALESCE(gs.duplicates_blocked, 0) AS duplicates_blocked,
  COALESCE(gs.invalid_rejected, 0) AS invalid_rejected,
  COALESCE(gs.fraud_suspected, 0) AS fraud_suspected,
  gs.last_scan_at,
  (SELECT COUNT(*) FROM gate_staff WHERE gate_id = cs.id AND is_active = TRUE) AS active_staff
FROM check_in_stations cs
LEFT JOIN gate_stats gs ON gs.gate_id = cs.id;

CREATE OR REPLACE VIEW staff_performance AS
SELECT u.id AS staff_id, u.first_name || ' ' || u.last_name AS staff_name,
  cs.name AS gate_name, cs.event_id,
  COUNT(DISTINCT ci.id) AS total_scans,
  COUNT(DISTINCT ci.id) FILTER (WHERE ci.scan_type = 'check_in') AS checkins,
  COUNT(DISTINCT co.id) AS checkouts,
  MIN(ci.scanned_at) AS first_scan, MAX(ci.scanned_at) AS last_scan
FROM users u
JOIN check_ins ci ON ci.staff_id = u.id
JOIN check_in_stations cs ON cs.id = ci.station_id
LEFT JOIN check_outs co ON co.staff_id = u.id AND co.event_id = ci.event_id
GROUP BY u.id, u.first_name, u.last_name, cs.name, cs.event_id;

-- ================================================================
-- PART 7: MISSING INDEXES (Foreign Keys)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_clients_plan_id ON clients(plan_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role_id ON client_memberships(role_id);
CREATE INDEX IF NOT EXISTS idx_invitations_role_id ON client_invitations(role_id);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_venue_id ON sessions(venue_id);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_type ON registrations(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_regforms_client ON registration_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in_by ON tickets(checked_in_by);
CREATE INDEX IF NOT EXISTS idx_checkins_session ON check_ins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_station ON check_ins(station_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_station ON check_outs(station_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_checkin ON check_outs(check_in_id);

-- Missing tables from notification schema (017)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email_enabled     BOOLEAN DEFAULT TRUE,
  marketing_enabled BOOLEAN DEFAULT TRUE,
  reminder_enabled  BOOLEAN DEFAULT TRUE,
  certificate_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
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
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_template ON certificates(template_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type_id);
CREATE INDEX IF NOT EXISTS idx_certificates_session ON certificates(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_template ON notifications(template_id);
CREATE INDEX IF NOT EXISTS idx_notifprefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifprefs_client ON notification_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_gateway_config_client ON payment_gateway_config(client_id);
CREATE INDEX IF NOT EXISTS idx_commissions_event ON commissions(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway ON billing_webhook_events(gateway);
CREATE INDEX IF NOT EXISTS idx_event_subs_plan ON event_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_event_venues_venue ON event_venues(venue_id);
CREATE INDEX IF NOT EXISTS idx_cohosts_event ON event_co_hosts(event_id);
CREATE INDEX IF NOT EXISTS idx_tags_event ON event_tags(event_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON event_tags(tag);
CREATE INDEX IF NOT EXISTS idx_tickettypes_client ON ticket_types(client_id);
CREATE INDEX IF NOT EXISTS idx_couponusage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_certsequences_client ON certificate_sequences(client_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_formanalytics_form ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_formanalytics_event ON form_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_formanalytics_date ON form_analytics(date);
CREATE INDEX IF NOT EXISTS idx_formtemplates_client ON form_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_emailtemplates_client ON client_email_templates(client_id);

-- ================================================================
-- PART 8: COMPREHENSIVE RLS POLICIES
-- ================================================================

-- Helper: consistent function names (both variants exist, make them all work)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'client_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'sub', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR(50) LANGUAGE SQL STABLE AS $$
  SELECT r.slug FROM client_memberships cm JOIN roles r ON r.id = cm.role_id
  WHERE cm.user_id = get_current_user_id() AND cm.client_id = get_current_client_id() AND cm.status = 'active' AND cm.deleted_at IS NULL;
$$;

-- Drop existing policies to recreate cleanly
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.tablename;
  END LOOP;
END $$;

-- 1. clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (id = get_current_client_id());
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (id = get_current_client_id());

-- 2. users
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = get_current_user_id());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = get_current_user_id());

-- 3. client_memberships
CREATE POLICY "memberships_select" ON client_memberships FOR SELECT USING (client_id = get_current_client_id() AND user_id = get_current_user_id());
CREATE POLICY "memberships_select_admin" ON client_memberships FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "memberships_insert" ON client_memberships FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "memberships_update" ON client_memberships FOR UPDATE USING (client_id = get_current_client_id());

-- 4. client_settings
CREATE POLICY "settings_select" ON client_settings FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "settings_update" ON client_settings FOR UPDATE USING (client_id = get_current_client_id());

-- 5. roles
CREATE POLICY "roles_select" ON roles FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "roles_insert" ON roles FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "roles_update" ON roles FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "roles_delete" ON roles FOR DELETE USING (client_id = get_current_client_id());

-- 6. permissions (global — readable by all authenticated)
CREATE POLICY "permissions_select" ON permissions FOR SELECT USING (TRUE);

-- 7. role_permissions
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM roles WHERE roles.id = role_id AND roles.client_id = get_current_client_id())
);
CREATE POLICY "role_permissions_insert" ON role_permissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM roles WHERE roles.id = role_id AND roles.client_id = get_current_client_id())
);
CREATE POLICY "role_permissions_delete" ON role_permissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM roles WHERE roles.id = role_id AND roles.client_id = get_current_client_id())
);

-- 8. user_sessions
CREATE POLICY "sessions_select_own" ON user_sessions FOR SELECT USING (user_id = get_current_user_id());
CREATE POLICY "sessions_delete_own" ON user_sessions FOR DELETE USING (user_id = get_current_user_id());

-- 9. api_keys
CREATE POLICY "apikeys_select" ON api_keys FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "apikeys_insert" ON api_keys FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "apikeys_update" ON api_keys FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "apikeys_delete" ON api_keys FOR DELETE USING (client_id = get_current_client_id());

-- 10. audit_logs
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (client_id = get_current_client_id());

-- 11. events
CREATE POLICY "events_select" ON events FOR SELECT USING (client_id = get_current_client_id() OR (is_public = TRUE AND status = 'published'));
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "events_update" ON events FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "events_delete" ON events FOR DELETE USING (client_id = get_current_client_id());

-- 12. event_categories
CREATE POLICY "categories_select" ON event_categories FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "categories_insert" ON event_categories FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "categories_update" ON event_categories FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "categories_delete" ON event_categories FOR DELETE USING (client_id = get_current_client_id());

-- 13. venues
CREATE POLICY "venues_select" ON venues FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "venues_insert" ON venues FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "venues_update" ON venues FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "venues_delete" ON venues FOR DELETE USING (client_id = get_current_client_id());

-- 14. sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "sessions_delete" ON sessions FOR DELETE USING (client_id = get_current_client_id());

-- 15. session_speakers
CREATE POLICY "speakers_select" ON session_speakers FOR SELECT USING (TRUE);
CREATE POLICY "speakers_insert" ON session_speakers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.client_id = get_current_client_id())
);
CREATE POLICY "speakers_update" ON session_speakers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.client_id = get_current_client_id())
);
CREATE POLICY "speakers_delete" ON session_speakers FOR DELETE USING (
  EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.client_id = get_current_client_id())
);

-- 16. registration_forms
CREATE POLICY "forms_select" ON registration_forms FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "forms_insert" ON registration_forms FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "forms_update" ON registration_forms FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "forms_delete" ON registration_forms FOR DELETE USING (client_id = get_current_client_id());

-- 17. form_fields
CREATE POLICY "fields_select" ON form_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);
CREATE POLICY "fields_insert" ON form_fields FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);
CREATE POLICY "fields_update" ON form_fields FOR UPDATE USING (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);
CREATE POLICY "fields_delete" ON form_fields FOR DELETE USING (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);

-- 18. form_sections (missing from COMPLETE_MIGRATION)
CREATE TABLE IF NOT EXISTS form_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id     UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_sections_form ON form_sections(form_id);

ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sections_select" ON form_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);
CREATE POLICY "sections_insert" ON form_sections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);
CREATE POLICY "sections_update" ON form_sections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);
CREATE POLICY "sections_delete" ON form_sections FOR DELETE USING (
  EXISTS (SELECT 1 FROM registration_forms WHERE registration_forms.id = form_id AND registration_forms.client_id = get_current_client_id())
);

-- 19. registrations
CREATE POLICY "reg_select_own" ON registrations FOR SELECT USING (email = current_setting('request.jwt.claims', TRUE)::json->>'email');
CREATE POLICY "reg_select_admin" ON registrations FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "reg_insert" ON registrations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reg_update" ON registrations FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "reg_delete" ON registrations FOR DELETE USING (client_id = get_current_client_id());

-- 20. registration_responses
CREATE POLICY "resp_select" ON registration_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM registrations WHERE registrations.id = registration_id AND registrations.client_id = get_current_client_id())
);
CREATE POLICY "resp_insert" ON registration_responses FOR INSERT WITH CHECK (TRUE);

-- 21. tickets
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "tickets_delete" ON tickets FOR DELETE USING (client_id = get_current_client_id());

-- 22. coupon
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "coupons_update" ON coupons FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "coupons_delete" ON coupons FOR DELETE USING (client_id = get_current_client_id());

-- 23. waitlists
CREATE POLICY "waitlists_select" ON waitlists FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "waitlists_insert" ON waitlists FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "waitlists_update" ON waitlists FOR UPDATE USING (client_id = get_current_client_id());

-- 24. check_in_stations
CREATE POLICY "stations_select" ON check_in_stations FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "stations_insert" ON check_in_stations FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "stations_update" ON check_in_stations FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "stations_delete" ON check_in_stations FOR DELETE USING (client_id = get_current_client_id());

-- 25. check_ins
CREATE POLICY "checkins_select" ON check_ins FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "checkins_insert" ON check_ins FOR INSERT WITH CHECK (client_id = get_current_client_id());

-- 26. check_outs
CREATE POLICY "checkouts_select" ON check_outs FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "checkouts_insert" ON check_outs FOR INSERT WITH CHECK (client_id = get_current_client_id());

-- 27. attendance_summary
CREATE POLICY "summary_select" ON attendance_summary FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "summary_update" ON attendance_summary FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "summary_insert" ON attendance_summary FOR INSERT WITH CHECK (client_id = get_current_client_id());

-- 28. offline_scans
CREATE POLICY "offline_select" ON offline_scans FOR SELECT USING (TRUE);
CREATE POLICY "offline_insert" ON offline_scans FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "offline_update" ON offline_scans FOR UPDATE USING (TRUE);

-- 29. certificate_types
CREATE POLICY "certtypes_select" ON certificate_types FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "certtypes_insert" ON certificate_types FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "certtypes_update" ON certificate_types FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "certtypes_delete" ON certificate_types FOR DELETE USING (client_id = get_current_client_id());

-- 30. certificate_templates
CREATE POLICY "certtemplates_select" ON certificate_templates FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "certtemplates_insert" ON certificate_templates FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "certtemplates_update" ON certificate_templates FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "certtemplates_delete" ON certificate_templates FOR DELETE USING (client_id = get_current_client_id());

-- 31. certificates
CREATE POLICY "certs_select_admin" ON certificates FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "certs_select_public" ON certificates FOR SELECT USING (status = 'issued');
CREATE POLICY "certs_insert" ON certificates FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "certs_update" ON certificates FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "certs_delete" ON certificates FOR DELETE USING (client_id = get_current_client_id());

-- 32. certificate_verifications
CREATE POLICY "verifications_select" ON certificate_verifications FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "verifications_insert" ON certificate_verifications FOR INSERT WITH CHECK (TRUE);

-- 33. certificate_downloads
CREATE POLICY "downloads_select" ON certificate_downloads FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "downloads_insert" ON certificate_downloads FOR INSERT WITH CHECK (TRUE);

-- 34. certificate_share_links
CREATE POLICY "sharelinks_select" ON certificate_share_links FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "sharelinks_insert" ON certificate_share_links FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "sharelinks_update" ON certificate_share_links FOR UPDATE USING (client_id = get_current_client_id());

-- 35. qr_nonces
CREATE POLICY "nonces_select" ON qr_nonces FOR SELECT USING (TRUE);
CREATE POLICY "nonces_insert" ON qr_nonces FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "nonces_update" ON qr_nonces FOR UPDATE USING (TRUE);

-- 36. qr_scan_attempts
CREATE POLICY "scans_select" ON qr_scan_attempts FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "scans_insert" ON qr_scan_attempts FOR INSERT WITH CHECK (TRUE);

-- 37. gate sessions/staff/stats
CREATE POLICY "gatesessions_select" ON gate_sessions FOR SELECT USING (TRUE);
CREATE POLICY "gatestaff_select" ON gate_staff FOR SELECT USING (TRUE);
CREATE POLICY "gatestaff_insert" ON gate_staff FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "gatestats_select" ON gate_stats FOR SELECT USING (client_id = get_current_client_id());

-- 38. staff_shifts
CREATE POLICY "shifts_select" ON staff_shifts FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.client_id = get_current_client_id())
);
CREATE POLICY "shifts_insert" ON staff_shifts FOR INSERT WITH CHECK (TRUE);

-- 39. attendance_rules
CREATE POLICY "rules_select" ON attendance_rules FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "rules_insert" ON attendance_rules FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "rules_update" ON attendance_rules FOR UPDATE USING (client_id = get_current_client_id());

-- 40. session_attendance
CREATE POLICY "session_att_select" ON session_attendance FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "session_att_update" ON session_attendance FOR UPDATE USING (client_id = get_current_client_id());

-- 41. payment methods
CREATE POLICY "paymethods_select" ON payment_methods FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "paymethods_insert" ON payment_methods FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "paymethods_update" ON payment_methods FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "paymethods_delete" ON payment_methods FOR DELETE USING (client_id = get_current_client_id());

-- 42. payments
CREATE POLICY "payments_select" ON payments FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (client_id = get_current_client_id());

-- 43. notification_templates
CREATE POLICY "notiftemplates_select" ON notification_templates FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "notiftemplates_insert" ON notification_templates FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "notiftemplates_update" ON notification_templates FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "notiftemplates_delete" ON notification_templates FOR DELETE USING (client_id = get_current_client_id());

-- 44. notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (client_id = get_current_client_id());

-- 45. notification_preferences
CREATE POLICY "notifprefs_select" ON notification_preferences FOR SELECT USING (user_id = get_current_user_id());
CREATE POLICY "notifprefs_insert" ON notification_preferences FOR INSERT WITH CHECK (user_id = get_current_user_id());
CREATE POLICY "notifprefs_update" ON notification_preferences FOR UPDATE USING (user_id = get_current_user_id());

-- 46. notification_queue
CREATE POLICY "queue_select" ON notification_queue FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "queue_update" ON notification_queue FOR UPDATE USING (client_id = get_current_client_id());

-- 47. webhook_endpoints
CREATE POLICY "webhooks_select" ON webhook_endpoints FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "webhooks_insert" ON webhook_endpoints FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "webhooks_update" ON webhook_endpoints FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "webhooks_delete" ON webhook_endpoints FOR DELETE USING (client_id = get_current_client_id());

-- 48. webhook_deliveries
CREATE POLICY "deliveries_select" ON webhook_deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM webhook_endpoints WHERE webhook_endpoints.id = endpoint_id AND webhook_endpoints.client_id = get_current_client_id())
);

-- 49. registration_links
CREATE POLICY "links_select" ON registration_links FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "links_insert" ON registration_links FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "links_update" ON registration_links FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "links_delete" ON registration_links FOR DELETE USING (client_id = get_current_client_id());

-- 50. subscription_plans (public — viewable by all)
CREATE POLICY "plans_select" ON subscription_plans FOR SELECT USING (TRUE);

-- 51. client_subscriptions
CREATE POLICY "subs_select" ON client_subscriptions FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "subs_insert" ON client_subscriptions FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "subs_update" ON client_subscriptions FOR UPDATE USING (client_id = get_current_client_id());

-- 52. payment_gateway_config
CREATE POLICY "gateway_select" ON payment_gateway_config FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "gateway_insert" ON payment_gateway_config FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "gateway_update" ON payment_gateway_config FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "gateway_delete" ON payment_gateway_config FOR DELETE USING (client_id = get_current_client_id());

-- 53. invoices
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (client_id = get_current_client_id());

-- 54. invoice_items
CREATE POLICY "items_select" ON invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND invoices.client_id = get_current_client_id())
);

-- 55. commissions
CREATE POLICY "commissions_select" ON commissions FOR SELECT USING (client_id = get_current_client_id());

-- 56. billing_webhook_events
CREATE POLICY "billing_webhooks_select" ON billing_webhook_events FOR SELECT USING (client_id = get_current_client_id());

-- 57. fraud_rules
CREATE POLICY "fraudrules_select" ON fraud_rules FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "fraudrules_insert" ON fraud_rules FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "fraudrules_update" ON fraud_rules FOR UPDATE USING (client_id = get_current_client_id());

-- 58. fraud_alerts
CREATE POLICY "fraudalerts_select" ON fraud_alerts FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "fraudalerts_update" ON fraud_alerts FOR UPDATE USING (client_id = get_current_client_id());

-- 59. event_subscriptions
CREATE POLICY "eventsubs_select" ON event_subscriptions FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "eventsubs_insert" ON event_subscriptions FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "eventsubs_update" ON event_subscriptions FOR UPDATE USING (client_id = get_current_client_id());

-- 60. event_branding
CREATE POLICY "evbranding_select" ON event_branding FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "evbranding_insert" ON event_branding FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "evbranding_update" ON event_branding FOR UPDATE USING (client_id = get_current_client_id());

-- 61. client_branding
CREATE POLICY "clbranding_select" ON client_branding FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "clbranding_insert" ON client_branding FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "clbranding_update" ON client_branding FOR UPDATE USING (client_id = get_current_client_id());

-- 62. client_email_templates
CREATE POLICY "emailtemplates_select" ON client_email_templates FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "emailtemplates_insert" ON client_email_templates FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "emailtemplates_update" ON client_email_templates FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "emailtemplates_delete" ON client_email_templates FOR DELETE USING (client_id = get_current_client_id());

-- 63. client_invitations
CREATE POLICY "invitations_select" ON client_invitations FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "invitations_insert" ON client_invitations FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "invitations_update" ON client_invitations FOR UPDATE USING (client_id = get_current_client_id());

-- 64. event_templates
CREATE POLICY "evtemplates_select" ON event_templates FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "evtemplates_insert" ON event_templates FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "evtemplates_update" ON event_templates FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "evtemplates_delete" ON event_templates FOR DELETE USING (client_id = get_current_client_id());

-- 65. event_co_hosts
CREATE POLICY "cohosts_select" ON event_co_hosts FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "cohosts_insert" ON event_co_hosts FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "cohosts_delete" ON event_co_hosts FOR DELETE USING (client_id = get_current_client_id());

-- 66. volunteer tables
CREATE POLICY "voltasks_select" ON volunteer_tasks FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "voltasks_insert" ON volunteer_tasks FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "voltasks_update" ON volunteer_tasks FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "voltasks_delete" ON volunteer_tasks FOR DELETE USING (client_id = get_current_client_id());

CREATE POLICY "volapps_select" ON volunteer_applications FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "volapps_insert" ON volunteer_applications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "volapps_update" ON volunteer_applications FOR UPDATE USING (client_id = get_current_client_id());

CREATE POLICY "volassign_select" ON volunteer_assignments FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "volassign_insert" ON volunteer_assignments FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "volassign_update" ON volunteer_assignments FOR UPDATE USING (client_id = get_current_client_id());

CREATE POLICY "volavail_select" ON volunteer_availability FOR SELECT USING (TRUE);

-- ================================================================
-- PART 9: RLS ON TABLES THAT MISSED IT IN COMPLETE_MIGRATION
-- ================================================================

ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_co_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regeneration_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_captcha_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- DONE! All fixes applied.
-- ================================================================

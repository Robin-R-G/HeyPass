-- Payment Methods, Pricing & Manual Certificates Migration
-- ============================================================
-- Extends existing schema for organizer payment methods,
-- event pricing, manual certificate generation, and live attendance
-- ============================================================

-- ============================================================
-- PAYMENT METHODS (Organizer bank/UPI details)
-- ============================================================
CREATE TABLE payment_methods (
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

  -- Either bank_account or upi must be valid
  CONSTRAINT chk_payment_type CHECK (
    (method_type = 'bank_account' AND account_number IS NOT NULL AND ifsc_code IS NOT NULL)
    OR
    (method_type = 'upi' AND upi_id IS NOT NULL)
  )
);

CREATE INDEX idx_payment_methods_client ON payment_methods(client_id, is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- EVENT PRICING (Per-event and per-session pricing)
-- ============================================================
ALTER TABLE events ADD COLUMN is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN ticket_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE events ADD COLUMN currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE events ADD COLUMN payment_method_ids UUID[] DEFAULT '{}';

-- Per-session pricing (sub-events can be paid separately)
ALTER TABLE sessions ADD COLUMN is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN ticket_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sessions ADD COLUMN currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE sessions ADD COLUMN max_capacity INT;
ALTER TABLE sessions ADD COLUMN registrations_count INT DEFAULT 0;

-- ============================================================
-- PAYMENTS (Track payment records)
-- ============================================================
CREATE TABLE payments (
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

CREATE INDEX idx_payments_event ON payments(event_id, status);
CREATE INDEX idx_payments_client ON payments(client_id, created_at DESC);
CREATE INDEX idx_payments_registration ON payments(registration_id);

-- ============================================================
-- MANUAL CERTIFICATES (Organizer-created certificates)
-- ============================================================
ALTER TABLE certificates ADD COLUMN is_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE certificates ADD COLUMN manual_data JSONB;
-- manual_data: { name, email, event_title, event_date, custom_field_1, custom_field_2, ... }

-- ============================================================
-- SESSION ATTENDANCE COUNTS (Real-time aggregation)
-- ============================================================
CREATE TABLE session_attendance (
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

CREATE INDEX idx_session_attendance_event ON session_attendance(event_id);

-- ============================================================
-- FUNCTION: Auto-update session attendance on check-in
-- ============================================================
CREATE OR REPLACE FUNCTION update_session_attendance_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO session_attendance (session_id, event_id, client_id, total_checked_in, last_check_in_at)
    VALUES (NEW.session_id, NEW.event_id, NEW.client_id, 1, NEW.scanned_at)
    ON CONFLICT (session_id) DO UPDATE SET
      total_checked_in = session_attendance.total_checked_in + 1,
      last_check_in_at = NEW.scanned_at,
      updated_at = now();

    -- Also update sessions table count
    UPDATE sessions SET registrations_count = registrations_count + 1
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkin_session_attendance
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_session_attendance_checkin();

-- ============================================================
-- FUNCTION: Auto-update session attendance on check-out
-- ============================================================
CREATE OR REPLACE FUNCTION update_session_attendance_checkout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE session_attendance SET
      total_checked_out = total_checked_out + 1,
      last_check_out_at = NEW.scanned_at,
      updated_at = now()
    WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkout_session_attendance
  AFTER INSERT ON check_outs
  FOR EACH ROW
  EXECUTE FUNCTION update_session_attendance_checkout();

-- ============================================================
-- FUNCTION: Auto-update session registrations_count on session UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION sync_session_registrations_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Recount from registrations table for this session
  UPDATE sessions SET registrations_count = (
    SELECT COUNT(*) FROM registrations
    WHERE session_id = NEW.id
    AND status IN ('confirmed', 'checked_in', 'checked_out')
    AND deleted_at IS NULL
  ) WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEW: Event ticket summary
-- ============================================================
CREATE OR REPLACE VIEW event_ticket_summary AS
SELECT
  e.id AS event_id,
  e.client_id,
  e.title AS event_title,
  e.is_free,
  e.ticket_price,
  e.currency,
  COUNT(t.id) AS total_tickets,
  COUNT(t.id) FILTER (WHERE t.status = 'active') AS active_tickets,
  COUNT(t.id) FILTER (WHERE t.status = 'used') AS used_tickets,
  COUNT(t.id) FILTER (WHERE t.status = 'cancelled') AS cancelled_tickets,
  COUNT(r.id) AS total_registrations,
  COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed_registrations,
  COUNT(r.id) FILTER (WHERE r.status = 'checked_in') AS checked_in_registrations,
  COALESCE(SUM(CASE WHEN t.status = 'active' THEN p.amount ELSE 0 END), 0) AS pending_revenue,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS collected_revenue
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id AND t.deleted_at IS NULL
LEFT JOIN registrations r ON r.event_id = e.id AND r.deleted_at IS NULL
LEFT JOIN payments p ON p.event_id = e.id AND p.registration_id = r.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.client_id, e.title, e.is_free, e.ticket_price, e.currency;

-- ============================================================
-- VIEW: Live session attendance
-- ============================================================
CREATE OR REPLACE VIEW live_session_attendance AS
SELECT
  sa.session_id,
  sa.event_id,
  sa.client_id,
  s.title AS session_title,
  s.start_time,
  s.end_time,
  s.status AS session_status,
  s.max_capacity,
  sa.total_registered,
  sa.total_checked_in,
  sa.total_checked_out,
  CASE
    WHEN sa.total_registered > 0
    THEN ROUND((sa.total_checked_in::DECIMAL / sa.total_registered) * 100, 1)
    ELSE 0
  END AS attendance_percentage,
  sa.last_check_in_at,
  sa.last_check_out_at
FROM session_attendance sa
JOIN sessions s ON s.id = sa.session_id
ORDER BY sa.event_id, s.start_time;

-- ============================================================
-- RLS Policies for new tables
-- ============================================================

-- payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_isolation" ON payment_methods
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);

CREATE POLICY "payment_methods_service" ON payment_methods
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_isolation" ON payments
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);

CREATE POLICY "payments_service" ON payments
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

-- session_attendance
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_attendance_isolation" ON session_attendance
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);

CREATE POLICY "session_attendance_service" ON session_attendance
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

-- Phase 15: Gate Management & Attendance Architecture
-- Multi-gate, multi-staff, real-time attendance, auto-checkout, eligibility

-- ============================================================
-- GATE TYPES ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE gate_type AS ENUM ('main_entrance', 'session_gate', 'exit_gate', 'vip_lane');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- GATE SESSIONS (Which sessions a gate covers)
-- ============================================================
CREATE TABLE gate_sessions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  gate_id   UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(gate_id, session_id)
);

CREATE INDEX idx_gate_sessions_gate ON gate_sessions(gate_id);
CREATE INDEX idx_gate_sessions_session ON gate_sessions(session_id);

-- ============================================================
-- GATE STAFF (Staff assignments to gates with shifts)
-- ============================================================
CREATE TABLE gate_staff (
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

CREATE INDEX idx_gate_staff_gate ON gate_staff(gate_id, is_active);
CREATE INDEX idx_gate_staff_staff ON gate_staff(staff_id, is_active);

-- ============================================================
-- GATE STATS (Aggregated per-gate counters)
-- ============================================================
CREATE TABLE gate_stats (
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

CREATE INDEX idx_gate_stats_event ON gate_stats(event_id);
CREATE INDEX idx_gate_stats_gate ON gate_stats(gate_id);

-- ============================================================
-- STAFF SHIFTS (Track staff working hours)
-- ============================================================
CREATE TABLE staff_shifts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  staff_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gate_id       UUID NOT NULL REFERENCES check_in_stations(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shift_start   TIMESTAMPTZ NOT NULL,
  shift_end     TIMESTAMPTZ,
  total_scans   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_shifts_staff ON staff_shifts(staff_id, shift_start DESC);
CREATE INDEX idx_staff_shifts_event ON staff_shifts(event_id);

-- ============================================================
-- ATTENDANCE RULES (Per-event eligibility configuration)
-- ============================================================
CREATE TABLE attendance_rules (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id                    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id                   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  require_checkout            BOOLEAN DEFAULT FALSE,
  min_duration_minutes        INT,
  min_sessions_attended       INT,
  required_session_ids        UUID[],
  duration_percentage_threshold DECIMAL(5,2),
  auto_checkout_enabled       BOOLEAN DEFAULT TRUE,
  auto_checkout_grace_minutes INT DEFAULT 60,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id)
);

-- ============================================================
-- ALTER check_in_stations: Add gate_type and capacity columns
-- ============================================================
ALTER TABLE check_in_stations ADD COLUMN gate_type gate_type DEFAULT 'main_entrance';
ALTER TABLE check_in_stations ADD COLUMN max_scans_per_min INT DEFAULT 60;
ALTER TABLE check_in_stations ADD COLUMN assigned_sessions UUID[] DEFAULT '{}';
ALTER TABLE check_in_stations ADD COLUMN auto_checkout_enabled BOOLEAN DEFAULT TRUE;

-- ============================================================
-- FUNCTION: Update gate_stats on every scan
-- ============================================================
CREATE OR REPLACE FUNCTION update_gate_stats_on_scan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gate_stats (gate_id, event_id, client_id, total_scans, last_scan_at, updated_at)
  VALUES (NEW.station_id, NEW.event_id, NEW.client_id, 1, NEW.scanned_at, now())
  ON CONFLICT (gate_id, event_id) DO UPDATE SET
    total_scans = gate_stats.total_scans + 1,
    successful_checkins = gate_stats.successful_checkins + CASE WHEN NEW.scan_type = 'check_in' THEN 1 ELSE 0 END,
    successful_checkouts = gate_stats.successful_checkouts + CASE WHEN NEW.scan_type = 'check_out' THEN 1 ELSE 0 END,
    last_scan_at = NEW.scanned_at,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_gate_stats
  AFTER INSERT ON check_ins
  FOR EACH ROW
  WHEN (NEW.station_id IS NOT NULL)
  EXECUTE FUNCTION update_gate_stats_on_scan();

-- ============================================================
-- FUNCTION: Update gate_stats for fraud/duplicate from qr_scan_attempts
-- ============================================================
CREATE OR REPLACE FUNCTION update_gate_stats_on_fraud()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_result = 'duplicate' AND NEW.station_id IS NOT NULL THEN
    INSERT INTO gate_stats (gate_id, event_id, client_id, duplicates_blocked, updated_at)
    VALUES (NEW.station_id, NEW.event_id, NEW.client_id, 1, now())
    ON CONFLICT (gate_id, event_id) DO UPDATE SET
      duplicates_blocked = gate_stats.duplicates_blocked + 1,
      updated_at = now();
  ELSIF NEW.scan_result IN ('invalid', 'fraud_suspected') AND NEW.station_id IS NOT NULL THEN
    INSERT INTO gate_stats (gate_id, event_id, client_id, invalid_rejected, fraud_suspected, updated_at)
    VALUES (NEW.station_id, NEW.event_id, NEW.client_id, 1, CASE WHEN NEW.scan_result = 'fraud_suspected' THEN 1 ELSE 0 END, now())
    ON CONFLICT (gate_id, event_id) DO UPDATE SET
      invalid_rejected = gate_stats.invalid_rejected + 1,
      fraud_suspected = gate_stats.fraud_suspected + CASE WHEN NEW.scan_result = 'fraud_suspected' THEN gate_stats.fraud_suspected + 1 ELSE gate_stats.fraud_suspected END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_gate_fraud_stats
  AFTER INSERT ON qr_scan_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_gate_stats_on_fraud();

-- ============================================================
-- VIEW: Gate performance dashboard
-- ============================================================
CREATE OR REPLACE VIEW gate_performance AS
SELECT
  cs.id AS gate_id,
  cs.name AS gate_name,
  cs.gate_type,
  cs.location,
  cs.event_id,
  cs.client_id,
  gs.total_scans,
  gs.successful_checkins,
  gs.successful_checkouts,
  gs.duplicates_blocked,
  gs.invalid_rejected,
  gs.fraud_suspected,
  gs.last_scan_at,
  cs.is_active,
  cs.last_ping_at,
  (SELECT COUNT(*) FROM gate_staff gst WHERE gst.gate_id = cs.id AND gst.is_active = TRUE) AS active_staff
FROM check_in_stations cs
LEFT JOIN gate_stats gs ON gs.gate_id = cs.id AND gs.event_id = cs.event_id
ORDER BY gs.total_scans DESC NULLS LAST;

-- ============================================================
-- VIEW: Staff performance
-- ============================================================
CREATE OR REPLACE VIEW staff_performance AS
SELECT
  ci.staff_id,
  u.first_name || ' ' || u.last_name AS staff_name,
  ci.event_id,
  ci.station_id AS gate_id,
  cs.name AS gate_name,
  COUNT(ci.id) AS total_scans,
  COUNT(ci.id) FILTER (WHERE ci.scan_type = 'check_in') AS checkins,
  COUNT(ci.id) FILTER (WHERE ci.scan_type = 'check_out') AS checkouts,
  MIN(ci.scanned_at) AS first_scan,
  MAX(ci.scanned_at) AS last_scan
FROM check_ins ci
JOIN users u ON u.id = ci.staff_id
LEFT JOIN check_in_stations cs ON cs.id = ci.station_id
WHERE ci.staff_id IS NOT NULL
GROUP BY ci.staff_id, u.first_name, u.last_name, ci.event_id, ci.station_id, cs.name;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE gate_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate_sessions_isolation" ON gate_sessions
  FOR ALL USING (
    gate_id IN (SELECT id FROM check_in_stations WHERE client_id = current_setting('app.current_client_id', TRUE)::UUID)
  );
CREATE POLICY "gate_sessions_service" ON gate_sessions
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

ALTER TABLE gate_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate_staff_isolation" ON gate_staff
  FOR ALL USING (
    gate_id IN (SELECT id FROM check_in_stations WHERE client_id = current_setting('app.current_client_id', TRUE)::UUID)
  );
CREATE POLICY "gate_staff_service" ON gate_staff
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

ALTER TABLE gate_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate_stats_isolation" ON gate_stats
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);
CREATE POLICY "gate_stats_service" ON gate_stats
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_shifts_isolation" ON staff_shifts
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);
CREATE POLICY "staff_shifts_service" ON staff_shifts
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_rules_isolation" ON attendance_rules
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);
CREATE POLICY "attendance_rules_service" ON attendance_rules
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

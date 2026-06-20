-- Phase 14: QR Security Module
-- HMAC signing, nonce tracking, rotation, replay prevention

-- ============================================================
-- QR NONCES (Tracks every QR generation for replay detection)
-- ============================================================
CREATE TABLE qr_nonces (
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

CREATE INDEX idx_qr_nonces_ticket ON qr_nonces(ticket_id, is_active);
CREATE INDEX idx_qr_nonces_nonce ON qr_nonces(nonce) WHERE is_active = TRUE;
CREATE INDEX idx_qr_nonces_expires ON qr_nonces(expires_at) WHERE is_active = TRUE;

-- ============================================================
-- QR SCAN ATTEMPTS (Audit trail for every scan)
-- ============================================================
CREATE TABLE qr_scan_attempts (
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

CREATE INDEX idx_scan_attempts_event ON qr_scan_attempts(event_id, scanned_at DESC);
CREATE INDEX idx_scan_attempts_ticket ON qr_scan_attempts(ticket_id, scanned_at DESC);
CREATE INDEX idx_scan_attempts_station ON qr_scan_attempts(station_id, scanned_at DESC);
CREATE INDEX idx_scan_attempts_fraud ON qr_scan_attempts(scan_result) WHERE scan_result = 'fraud_suspected';

-- ============================================================
-- ALTER TICKETS: Add QR security fields
-- ============================================================
ALTER TABLE tickets ADD COLUMN qr_version INT DEFAULT 1;
ALTER TABLE tickets ADD COLUMN qr_last_rotated_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN qr_rotation_count INT DEFAULT 0;

-- ============================================================
-- UNIQUE CONSTRAINT: Prevent duplicate check-ins per ticket per event
-- ============================================================
CREATE UNIQUE INDEX idx_checkin_unique_per_ticket
  ON check_ins(ticket_id, event_id, session_id)
  WHERE scan_type = 'check_in';

-- ============================================================
-- FUNCTION: Increment QR rotation count on rotation
-- ============================================================
CREATE OR REPLACE FUNCTION update_qr_rotation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tickets SET
    qr_version = qr_version + 1,
    qr_rotation_count = qr_rotation_count + 1,
    qr_last_rotated_at = now(),
    updated_at = now()
  WHERE id = NEW.ticket_id;

  -- Deactivate previous nonces for this ticket
  UPDATE qr_nonces SET is_active = FALSE
  WHERE ticket_id = NEW.ticket_id
  AND id != NEW.id
  AND is_active = TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qr_rotation
  AFTER INSERT ON qr_nonces
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_rotation();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE qr_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_nonces_service" ON qr_nonces
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

ALTER TABLE qr_scan_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_scan_attempts_isolation" ON qr_scan_attempts
  FOR ALL USING (client_id = current_setting('app.current_client_id', TRUE)::UUID);

CREATE POLICY "qr_scan_attempts_service" ON qr_scan_attempts
  FOR ALL USING (current_setting('app.is_service_role', TRUE) = 'true');

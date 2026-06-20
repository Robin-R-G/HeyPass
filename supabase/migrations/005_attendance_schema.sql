-- Attendance & Check-In/Check-Out Schema

-- ============================================================
-- CHECK-IN STATIONS (Scanner device registration)
-- ============================================================
CREATE TABLE check_in_stations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  location      VARCHAR(255),
  device_id     VARCHAR(100),
  staff_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  last_ping_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stations_event ON check_in_stations(event_id);

-- ============================================================
-- CHECK-INS
-- ============================================================
CREATE TABLE check_ins (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id        UUID REFERENCES sessions(id) ON DELETE SET NULL,
  registration_id   UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  ticket_id         UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  station_id        UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  scan_type         VARCHAR(20) DEFAULT 'check_in' CHECK (scan_type IN ('check_in', 'check_out')),
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  qr_data           TEXT,
  ip_address        INET,
  device_id         VARCHAR(100),
  location          VARCHAR(255),
  is_offline        BOOLEAN DEFAULT FALSE,
  sync_id           UUID,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkin_event_time ON check_ins(event_id, scanned_at DESC);
CREATE INDEX idx_checkin_ticket ON check_ins(ticket_id, scan_type);
CREATE INDEX idx_checkin_registration ON check_ins(registration_id);
CREATE INDEX idx_checkin_staff ON check_ins(staff_id);

-- ============================================================
-- CHECK-OUTS
-- ============================================================
CREATE TABLE check_outs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  check_in_id       UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  registration_id   UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  ticket_id         UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  station_id        UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_checkout     BOOLEAN DEFAULT FALSE,
  duration_minutes  INT,
  ip_address        INET,
  device_id         VARCHAR(100),
  is_offline        BOOLEAN DEFAULT FALSE,
  sync_id           UUID,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkout_event ON check_outs(event_id, scanned_at DESC);
CREATE INDEX idx_checkout_checkin ON check_outs(check_in_id);
CREATE INDEX idx_checkout_ticket ON check_outs(ticket_id);

-- ============================================================
-- ATTENDANCE SUMMARY (Aggregated attendance data)
-- ============================================================
CREATE TABLE attendance_summary (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id       UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  check_in_time         TIMESTAMPTZ,
  check_out_time        TIMESTAMPTZ,
  duration_minutes      INT,
  attendance_percentage DECIMAL(5,2),
  is_eligible           BOOLEAN,
  eligibility_reason    TEXT,
  last_calculated_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(registration_id)
);

CREATE INDEX idx_summary_event ON attendance_summary(event_id, is_eligible);
CREATE INDEX idx_summary_eligible ON attendance_summary(event_id, is_eligible) WHERE is_eligible = TRUE;

-- ============================================================
-- OFFLINE SCANS (Local storage for offline support)
-- ============================================================
CREATE TABLE offline_scans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  scan_type           VARCHAR(20) NOT NULL CHECK (scan_type IN ('check_in', 'check_out')),
  ticket_id           UUID NOT NULL,
  event_id            UUID NOT NULL,
  registration_id     UUID NOT NULL,
  staff_id            UUID,
  scanned_at          TIMESTAMPTZ NOT NULL,
  qr_data             TEXT,
  synced              BOOLEAN DEFAULT FALSE,
  synced_at           TIMESTAMPTZ,
  conflict_resolution VARCHAR(20) DEFAULT 'pending' CHECK (conflict_resolution IN ('pending', 'local_wins', 'server_wins')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_offline_sync ON offline_scans(synced) WHERE synced = FALSE;

-- ============================================================
-- OFFLINE SYNC QUEUE
-- ============================================================
CREATE TABLE offline_sync_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  action      VARCHAR(50) NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  synced      BOOLEAN DEFAULT FALSE,
  synced_at   TIMESTAMPTZ,
  error       TEXT
);

CREATE INDEX idx_sync_queue ON offline_sync_queue(synced, created_at);

-- ================================================================
-- Migration 024: Emergency Dashboard
-- Tables for crisis management: incidents, contacts, lost & found
-- ================================================================

-- Emergency incidents
CREATE TABLE IF NOT EXISTS emergency_incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  incident_type   VARCHAR(50) NOT NULL
                    CHECK (incident_type IN ('medical','security','evacuation','facility','lost_found','other')),
  severity        VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  location        VARCHAR(255),
  reported_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  status          VARCHAR(20) DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emerg_incidents_event ON emergency_incidents(event_id, status);
CREATE INDEX IF NOT EXISTS idx_emerg_incidents_severity ON emergency_incidents(event_id, severity);
CREATE INDEX IF NOT EXISTS idx_emerg_incidents_status ON emergency_incidents(event_id, status);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL
                    CHECK (role IN ('medical','security','organizer','police','fire','ambulance')),
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255),
  location        VARCHAR(255),
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emerg_contacts_event ON emergency_contacts(event_id);

-- Lost and found items
CREATE TABLE IF NOT EXISTS lost_found_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_description    TEXT NOT NULL,
  category            VARCHAR(50) DEFAULT 'other'
                        CHECK (category IN ('electronics','clothing','documents','bags','keys','other')),
  found_location      VARCHAR(255),
  found_at            TIMESTAMPTZ,
  reported_by_name    VARCHAR(255),
  reported_by_phone   VARCHAR(20),
  claimed_by_name     VARCHAR(255),
  claimed_at          TIMESTAMPTZ,
  status              VARCHAR(20) DEFAULT 'found'
                        CHECK (status IN ('found','claimed','returned','disposed')),
  photo_url           VARCHAR(500),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lostfound_event ON lost_found_items(event_id, status);
CREATE INDEX IF NOT EXISTS idx_lostfound_status ON lost_found_items(event_id, status);

-- Incident timeline
CREATE TABLE IF NOT EXISTS incident_timeline (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  incident_id     UUID NOT NULL REFERENCES emergency_incidents(id) ON DELETE CASCADE,
  action          VARCHAR(255) NOT NULL,
  notes           TEXT,
  performed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id, created_at);

-- RLS
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies: client_id isolation
CREATE POLICY emergency_incidents_select ON emergency_incidents
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY emergency_incidents_insert ON emergency_incidents
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

CREATE POLICY emergency_incidents_update ON emergency_incidents
  FOR UPDATE USING (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

CREATE POLICY emergency_contacts_select ON emergency_contacts
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY emergency_contacts_insert ON emergency_contacts
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

CREATE POLICY emergency_contacts_update ON emergency_contacts
  FOR UPDATE USING (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

CREATE POLICY lost_found_items_select ON lost_found_items
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY lost_found_items_insert ON lost_found_items
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

CREATE POLICY lost_found_items_update ON lost_found_items
  FOR UPDATE USING (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

CREATE POLICY incident_timeline_select ON incident_timeline
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY incident_timeline_insert ON incident_timeline
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('event.manage_staff')
  );

-- Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('emergency.view','emergency','view','View emergency data'),
  ('emergency.manage','emergency','manage','Manage emergency incidents')
ON CONFLICT (name) DO NOTHING;

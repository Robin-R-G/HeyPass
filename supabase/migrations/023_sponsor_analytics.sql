-- ================================================================
-- Migration 023: Sponsor Analytics
-- Tables for sponsor management, branding placements, scan tracking
-- ================================================================

-- Sponsors per event
CREATE TABLE IF NOT EXISTS sponsors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  tier            VARCHAR(20) DEFAULT 'silver'
                    CHECK (tier IN ('platinum','gold','silver','bronze','custom')),
  logo_url        TEXT,
  website_url     TEXT,
  booth_location  VARCHAR(255),
  contact_name    VARCHAR(255),
  contact_email   VARCHAR(255),
  amount_paid     DECIMAL(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sponsors_event ON sponsors(event_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sponsors_client ON sponsors(client_id);

-- Sponsor branding placements (banner, stage screen, etc.)
CREATE TABLE IF NOT EXISTS sponsor_branding (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id      UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  placement_type  VARCHAR(30) NOT NULL
                    CHECK (placement_type IN ('banner','stage_digital','hall_screen','badge','certificate','webpage')),
  impressions     INT DEFAULT 0,
  unique_views    INT DEFAULT 0,
  clicks          INT DEFAULT 0,
  scans           INT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_branding_event ON sponsor_branding(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_branding_sponsor ON sponsor_branding(sponsor_id);

-- Individual scan/click records
CREATE TABLE IF NOT EXISTS sponsor_scans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id      UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  branding_id     UUID NOT NULL REFERENCES sponsor_branding(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  scan_type       VARCHAR(20) NOT NULL
                    CHECK (scan_type IN ('qr_code','url_click','banner_nfc')),
  device_info     TEXT,
  scanned_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_scans_event ON sponsor_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_scans_sponsor ON sponsor_scans(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_scans_branding ON sponsor_scans(branding_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_scans_time ON sponsor_scans(scanned_at);

-- RLS
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies: sponsors
CREATE POLICY sponsors_select ON sponsors
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY sponsors_insert ON sponsors
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('events.edit')
  );

CREATE POLICY sponsors_update ON sponsors
  FOR UPDATE USING (
    client_id = get_current_client_id()
    AND has_permission('events.edit')
  );

CREATE POLICY sponsors_delete ON sponsors
  FOR DELETE USING (
    client_id = get_current_client_id()
    AND has_permission('events.delete')
  );

-- RLS Policies: sponsor_branding
CREATE POLICY sponsor_branding_select ON sponsor_branding
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY sponsor_branding_insert ON sponsor_branding
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('events.edit')
  );

CREATE POLICY sponsor_branding_update ON sponsor_branding
  FOR UPDATE USING (
    client_id = get_current_client_id()
    AND has_permission('events.edit')
  );

CREATE POLICY sponsor_branding_delete ON sponsor_branding
  FOR DELETE USING (
    client_id = get_current_client_id()
    AND has_permission('events.delete')
  );

-- RLS Policies: sponsor_scans
CREATE POLICY sponsor_scans_select ON sponsor_scans
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY sponsor_scans_insert ON sponsor_scans
  FOR INSERT WITH CHECK (client_id = get_current_client_id());

-- Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('sponsor.view','sponsor','view','View sponsors'),
  ('sponsor.manage','sponsor','manage','Manage sponsors'),
  ('sponsor.analytics','sponsor','analytics','View sponsor analytics')
ON CONFLICT (name) DO NOTHING;

-- White Label Theme & Branding Schema

-- ============================================================
-- CLIENT BRANDING (Extended white-label configuration)
-- ============================================================
CREATE TABLE client_branding (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Identity
  brand_name            VARCHAR(255),
  tagline               VARCHAR(500),

  -- Logos
  logo_url              VARCHAR(500),
  college_logo_url      VARCHAR(500),
  favicon_url           VARCHAR(500),
  default_banner_url    VARCHAR(500),

  -- Colors (all hex)
  primary_color         VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color       VARCHAR(7) DEFAULT '#1D4ED8',
  accent_color          VARCHAR(7) DEFAULT '#10B981',
  background_color      VARCHAR(7) DEFAULT '#FFFFFF',
  text_color            VARCHAR(7) DEFAULT '#1F2937',
  success_color         VARCHAR(7) DEFAULT '#10B981',
  warning_color         VARCHAR(7) DEFAULT '#F59E0B',
  error_color           VARCHAR(7) DEFAULT '#EF4444',

  -- Typography
  font_family           VARCHAR(255) DEFAULT 'Inter, system-ui, sans-serif',
  font_heading_family   VARCHAR(255),

  -- Shape
  border_radius         SMALLINT DEFAULT 8 CHECK (border_radius >= 0 AND border_radius <= 24),

  -- White Label
  white_label_enabled   BOOLEAN DEFAULT FALSE,
  footer_text           TEXT,
  support_email         VARCHAR(255),
  support_phone         VARCHAR(50),

  -- Social
  social_links          JSONB DEFAULT '{}',

  -- Email
  email_from_name       VARCHAR(255),
  email_from_address    VARCHAR(255),
  email_reply_to        VARCHAR(255),

  -- Footer
  footer_company_name   VARCHAR(255),
  footer_website_url    VARCHAR(500),
  footer_copyright      TEXT,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id)
);

CREATE INDEX idx_branding_client ON client_branding(client_id);

-- ============================================================
-- EVENT BRANDING (Per-event overrides)
-- ============================================================
CREATE TABLE event_branding (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Image overrides
  banner_url            VARCHAR(500),
  logo_url              VARCHAR(500),

  -- Color overrides (NULL = use client branding)
  primary_color         VARCHAR(7),
  secondary_color       VARCHAR(7),
  accent_color          VARCHAR(7),
  background_color      VARCHAR(7),
  text_color            VARCHAR(7),

  -- Custom code
  custom_css            TEXT CHECK (length(custom_css) <= 10000),
  custom_head_html      TEXT CHECK (length(custom_head_html) <= 5000),

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id)
);

CREATE INDEX idx_event_branding_event ON event_branding(event_id);
CREATE INDEX idx_event_branding_client ON event_branding(client_id);

-- ============================================================
-- CLIENT EMAIL TEMPLATES (Override default templates)
-- ============================================================
CREATE TABLE client_email_templates (
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

CREATE INDEX idx_email_templates_client ON client_email_templates(client_id, is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- STORAGE BUCKET for branding assets
-- ============================================================
-- Note: Supabase Storage buckets must be created via API or dashboard
-- Bucket name: 'branding'
-- Structure:
--   branding/{client_id}/organization-logo.{ext}
--   branding/{client_id}/college-logo.{ext}
--   branding/{client_id}/favicon.{ext}
--   branding/{client_id}/default-banner.{ext}
--   event-branding/{event_id}/banner.{ext}
--   event-branding/{event_id}/logo.{ext}

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_client_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_branding_updated_at
  BEFORE UPDATE ON client_branding
  FOR EACH ROW EXECUTE FUNCTION update_client_branding_updated_at();

CREATE TRIGGER trigger_update_event_branding_updated_at
  BEFORE UPDATE ON event_branding
  FOR EACH ROW EXECUTE FUNCTION update_client_branding_updated_at();

CREATE TRIGGER trigger_update_client_email_templates_updated_at
  BEFORE UPDATE ON client_email_templates
  FOR EACH ROW EXECUTE FUNCTION update_client_branding_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE client_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_email_templates ENABLE ROW LEVEL SECURITY;

-- Client branding: members can read, settings.edit permission required for write
CREATE POLICY "client_branding_select" ON client_branding
  FOR SELECT USING (
    client_id = get_client_id()
  );

CREATE POLICY "client_branding_insert" ON client_branding
  FOR INSERT WITH CHECK (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "client_branding_update" ON client_branding
  FOR UPDATE USING (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- Event branding: members can read, events.edit permission required for write
CREATE POLICY "event_branding_select" ON event_branding
  FOR SELECT USING (
    client_id = get_client_id()
  );

CREATE POLICY "event_branding_insert" ON event_branding
  FOR INSERT WITH CHECK (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "event_branding_update" ON event_branding
  FOR UPDATE USING (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

-- Email templates: members can read, settings.edit permission required for write
CREATE POLICY "email_templates_select" ON client_email_templates
  FOR SELECT USING (
    client_id = get_client_id()
  );

CREATE POLICY "email_templates_insert" ON client_email_templates
  FOR INSERT WITH CHECK (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "email_templates_update" ON client_email_templates
  FOR UPDATE USING (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "email_templates_delete" ON client_email_templates
  FOR DELETE USING (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- ============================================================
-- HELPER: Resolve branding from client_id (with fallbacks)
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_client_branding(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_branding JSONB;
  v_defaults JSONB;
BEGIN
  -- Get client branding
  SELECT to_jsonb(cb.*) INTO v_branding
  FROM client_branding cb
  WHERE cb.client_id = p_client_id;

  -- System defaults
  v_defaults := '{
    "primary_color": "#3B82F6",
    "secondary_color": "#1D4ED8",
    "accent_color": "#10B981",
    "background_color": "#FFFFFF",
    "text_color": "#1F2937",
    "success_color": "#10B981",
    "warning_color": "#F59E0B",
    "error_color": "#EF4444",
    "font_family": "Inter, system-ui, sans-serif",
    "border_radius": 8,
    "white_label_enabled": false
  }'::jsonb;

  IF v_branding IS NULL THEN
    RETURN v_defaults;
  END IF;

  -- Merge with defaults (branding overrides defaults)
  RETURN v_defaults || v_branding;
END;
$$;

-- ============================================================
-- HELPER: Resolve branding for event (client + event overrides)
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_event_branding(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_event_branding JSONB;
  v_client_branding JSONB;
  v_client_id UUID;
BEGIN
  -- Get client_id from event
  SELECT e.client_id INTO v_client_id
  FROM events e
  WHERE e.id = p_event_id;

  IF v_client_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Get client branding
  v_client_branding := resolve_client_branding(v_client_id);

  -- Get event branding (overrides)
  SELECT to_jsonb(eb.*) INTO v_event_branding
  FROM event_branding eb
  WHERE eb.event_id = p_event_id;

  IF v_event_branding IS NULL THEN
    RETURN v_client_branding;
  END IF;

  -- Merge: event overrides client, client overrides defaults
  -- Remove NULL values from event branding (means "use client")
  v_event_branding := (
    SELECT jsonb_object_agg(key, value)
    FROM jsonb_each(v_event_branding)
    WHERE value IS NOT NULL AND value != 'null'::jsonb
  );

  RETURN v_client_branding || v_event_branding;
END;
$$;

-- ============================================================
-- HELPER: Resolve branding from domain
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_domain_branding(p_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Find client by custom domain
  SELECT cd.client_id INTO v_client_id
  FROM client_domains cd
  WHERE cd.domain = p_domain
    AND cd.verified = TRUE
  LIMIT 1;

  IF v_client_id IS NULL THEN
    -- Check clients.custom_domain as fallback
    SELECT c.id INTO v_client_id
    FROM clients c
    WHERE c.custom_domain = p_domain
      AND c.status = 'active'
      AND c.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN resolve_client_branding(v_client_id);
END;
$$;

-- ============================================================
-- SEED: Create default branding for existing clients
-- ============================================================
INSERT INTO client_branding (client_id, brand_name, primary_color, secondary_color, white_label_enabled)
SELECT
  c.id,
  c.name,
  c.primary_color,
  c.secondary_color,
  FALSE
FROM clients c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM client_branding cb WHERE cb.client_id = c.id
  );

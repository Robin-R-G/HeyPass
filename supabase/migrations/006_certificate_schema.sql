-- Certificate Automation Schema

-- ============================================================
-- CERTIFICATE TYPES
-- ============================================================
CREATE TABLE certificate_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  UNIQUE(client_id, slug)
);

CREATE INDEX idx_certtypes_client ON certificate_types(client_id) WHERE deleted_at IS NULL;

-- Seed default certificate types per client (inserted via function)

-- ============================================================
-- CERTIFICATE TEMPLATES
-- ============================================================
CREATE TABLE certificate_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type_id         UUID NOT NULL REFERENCES certificate_types(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  version         INT DEFAULT 1,
  is_active       BOOLEAN DEFAULT TRUE,
  orientation     VARCHAR(20) DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  page_size       VARCHAR(20) DEFAULT 'A4',
  background_url  VARCHAR(500),
  logo_url        VARCHAR(500),
  layout          JSONB NOT NULL,
  fields          JSONB NOT NULL,
  fonts           JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_templates_client_type ON certificate_templates(client_id, type_id) WHERE deleted_at IS NULL;

-- ============================================================
-- CERTIFICATE SEQUENCES (CERT-YEAR-SEQUENCE counter)
-- ============================================================
CREATE TABLE certificate_sequences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year          INT NOT NULL,
  last_sequence INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id, year)
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE certificates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id          UUID REFERENCES sessions(id) ON DELETE SET NULL,
  registration_id     UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  template_id         UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT,
  type_id             UUID NOT NULL REFERENCES certificate_types(id) ON DELETE RESTRICT,
  certificate_number  VARCHAR(50) UNIQUE NOT NULL,
  access_token        VARCHAR(64) UNIQUE NOT NULL,
  template_version    INT NOT NULL,
  version             INT DEFAULT 1,
  status              VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'delivered', 'downloaded', 'revoked')),
  pdf_url             VARCHAR(500),
  png_url             VARCHAR(500),
  thumbnail_url       VARCHAR(500),
  metadata            JSONB,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at        TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  revoke_reason       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cert_event ON certificates(client_id, event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cert_registration ON certificates(registration_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cert_number ON certificates(certificate_number);
CREATE INDEX idx_cert_access_token ON certificates(access_token);
CREATE INDEX idx_cert_status ON certificates(status, issued_at DESC);

-- ============================================================
-- CERTIFICATE DELIVERIES
-- ============================================================
CREATE TABLE certificate_deliveries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  method            VARCHAR(20) NOT NULL CHECK (method IN ('email', 'qr_scan', 'link_share', 'bulk_download')),
  recipient_email   VARCHAR(255),
  sent_at           TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  downloaded_at     TIMESTAMPTZ,
  ip_address        INET,
  user_agent        TEXT,
  device_type       VARCHAR(50),
  status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'downloaded', 'failed')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_delivery_cert ON certificate_deliveries(certificate_id);
CREATE INDEX idx_delivery_status ON certificate_deliveries(status, sent_at);

-- ============================================================
-- CERTIFICATE VERIFICATIONS
-- ============================================================
CREATE TABLE certificate_verifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  ip_address        INET NOT NULL,
  user_agent        TEXT,
  method            VARCHAR(20) NOT NULL CHECK (method IN ('number', 'qr_code', 'url')),
  country           VARCHAR(100),
  city              VARCHAR(100),
  device_type       VARCHAR(50),
  verified_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verification_cert ON certificate_verifications(certificate_id, verified_at DESC);
CREATE INDEX idx_verification_ip ON certificate_verifications(ip_address, verified_at DESC);
CREATE INDEX idx_verification_time ON certificate_verifications(verified_at DESC);

-- ============================================================
-- VERIFICATION RATE LIMITS
-- ============================================================
CREATE TABLE verification_rate_limits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ip_address        INET NOT NULL,
  window_start      TIMESTAMPTZ NOT NULL,
  request_count     INT DEFAULT 1,
  captcha_required  BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(ip_address, window_start)
);

-- ============================================================
-- VERIFICATION CAPTCHA SESSIONS
-- ============================================================
CREATE TABLE verification_captcha_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  ip_address    INET,
  captcha_token VARCHAR(500),
  verified_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- REGENERATION USAGE TRACKING
-- ============================================================
CREATE TABLE regeneration_usage (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id        UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  reason                TEXT,
  regenerated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  new_template_version  INT,
  old_pdf_url           VARCHAR(500),
  new_pdf_url           VARCHAR(500)
);

CREATE INDEX idx_regen_client ON regeneration_usage(client_id, regenerated_at DESC);

-- ============================================================
-- ZIP EXPORT JOBS
-- ============================================================
CREATE TABLE zip_export_jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  certificate_type    UUID REFERENCES certificate_types(id) ON DELETE SET NULL,
  total_certificates  INT,
  zip_count           INT,
  status              VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  download_links      JSONB,
  job_id              VARCHAR(100),
  created_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ
);

CREATE INDEX idx_zip_client ON zip_export_jobs(client_id, created_at DESC);

-- Registration & Ticketing Schema

-- ============================================================
-- REGISTRATION FORMS (Custom form definitions)
-- ============================================================
CREATE TABLE registration_forms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(255) DEFAULT 'Default Form',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_forms_event ON registration_forms(event_id);

-- ============================================================
-- FORM FIELDS (Individual field configurations)
-- ============================================================
CREATE TABLE form_fields (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id         UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  label           VARCHAR(255) NOT NULL,
  field_type      VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file', 'country', 'state')),
  placeholder     VARCHAR(255),
  is_required     BOOLEAN DEFAULT FALSE,
  is_unique       BOOLEAN DEFAULT FALSE,
  sort_order      INT DEFAULT 0,
  options         JSONB,
  validation      JSONB,
  conditional_logic JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fields_form ON form_fields(form_id);

-- ============================================================
-- TICKET TYPES (Pricing tiers per event)
-- ============================================================
CREATE TABLE ticket_types (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'USD',
  capacity        INT,
  tickets_sold    INT DEFAULT 0,
  max_per_order   INT DEFAULT 5,
  sales_start     TIMESTAMPTZ,
  sales_end       TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tickettypes_event ON ticket_types(event_id, is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- REGISTRATIONS
-- ============================================================
CREATE TABLE registrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ticket_type_id    UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'waitlisted')),
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(20),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  company           VARCHAR(255),
  job_title         VARCHAR(255),
  custom_fields     JSONB,
  source            VARCHAR(50),
  referral_code     VARCHAR(50),
  notes             TEXT,
  ip_address        INET,
  user_agent        TEXT,
  checked_in_at     TIMESTAMPTZ,
  checked_out_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_reg_event_status ON registrations(event_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_reg_email_event ON registrations(event_id, email) WHERE deleted_at IS NULL AND status != 'cancelled';
CREATE INDEX idx_reg_client_created ON registrations(client_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reg_phone ON registrations(phone) WHERE deleted_at IS NULL;

-- ============================================================
-- REGISTRATION RESPONSES (Submitted form data)
-- ============================================================
CREATE TABLE registration_responses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  registration_id   UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  field_id          UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  value             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(registration_id, field_id)
);

CREATE INDEX idx_responses_registration ON registration_responses(registration_id);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE tickets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  registration_id     UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ticket_number       VARCHAR(50) UNIQUE NOT NULL,
  qr_code_hash        VARCHAR(64) UNIQUE NOT NULL,
  qr_code_url         VARCHAR(500),
  access_token        VARCHAR(64) UNIQUE NOT NULL,
  pdf_url             VARCHAR(500),
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'transferred')),
  checked_in_at       TIMESTAMPTZ,
  checked_out_at      TIMESTAMPTZ,
  checked_in_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  check_in_station_id UUID,
  transferred_to      UUID,
  transfer_count      INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ticket_scan ON tickets(event_id, qr_code_hash, status);
CREATE INDEX idx_ticket_registration ON tickets(registration_id);
CREATE INDEX idx_ticket_access_token ON tickets(access_token);
CREATE INDEX idx_ticket_number ON tickets(ticket_number);

-- ============================================================
-- COUPONS (Discount codes)
-- ============================================================
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,
  discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  DECIMAL(10,2) NOT NULL,
  max_uses        INT,
  current_uses    INT DEFAULT 0,
  min_order_amount DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(code, event_id)
);

CREATE INDEX idx_coupons_event ON coupons(event_id);
CREATE INDEX idx_coupons_code ON coupons(code, event_id);

-- ============================================================
-- COUPON USAGE
-- ============================================================
CREATE TABLE coupon_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WAITLIST
-- ============================================================
CREATE TABLE waitlists (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email             VARCHAR(255) NOT NULL,
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  phone             VARCHAR(20),
  ticket_type_id    UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  position          INT NOT NULL,
  status            VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'expired', 'cancelled')),
  promoted_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, email)
);

CREATE INDEX idx_waitlist_event ON waitlists(event_id, status);
CREATE INDEX idx_waitlist_position ON waitlists(event_id, position);

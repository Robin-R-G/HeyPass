-- Integration Schema

-- ============================================================
-- 1. Enhance API Keys table
-- ============================================================
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'full' CHECK (scope IN ('full', 'event', 'read_only', 'webhook')),
  ADD COLUMN IF NOT EXISTS rate_limit INT DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS ip_whitelist INET[],
  ADD COLUMN IF NOT EXISTS last_used_ip INET;

CREATE INDEX IF NOT EXISTS idx_apikeys_event ON api_keys(event_id) WHERE event_id IS NOT NULL;

-- ============================================================
-- 2. WEBHOOK ENDPOINTS
-- ============================================================
CREATE TABLE webhook_endpoints (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url               VARCHAR(500) NOT NULL,
  description       TEXT,
  events            JSONB NOT NULL DEFAULT '[]',
  secret            VARCHAR(64) NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count     INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_webhooks_client ON webhook_endpoints(client_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. WEBHOOK DELIVERIES
-- ============================================================
CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  response_code   INT,
  response_body   TEXT,
  attempts        INT DEFAULT 0,
  max_attempts    INT DEFAULT 3,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at);

-- ============================================================
-- 4. REGISTRATION SHORT LINKS
-- ============================================================
CREATE TABLE registration_links (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  short_code          VARCHAR(20) UNIQUE NOT NULL,
  utm_source          VARCHAR(100),
  utm_medium          VARCHAR(100),
  utm_campaign        VARCHAR(100),
  click_count         INT DEFAULT 0,
  registration_count  INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reglinks_code ON registration_links(short_code);
CREATE INDEX idx_reglinks_event ON registration_links(event_id);

-- ============================================================
-- 5. Function: generate API key
-- ============================================================
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_random VARCHAR(32);
BEGIN
  v_prefix := 'hp_' || LOWER(encode(gen_random_bytes(4), 'hex'));
  v_random := encode(gen_random_bytes(24), 'hex');
  RETURN v_prefix || v_random;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Function: generate short code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  v_code VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := LOWER(encode(gen_random_bytes(4), 'base64'));
    v_code := REPLACE(v_code, '+', 'a');
    v_code := REPLACE(v_code, '/', 'b');
    v_code := REPLACE(v_code, '=', '');
    v_code := SUBSTRING(v_code FROM 1 FOR 8);

    SELECT EXISTS(SELECT 1 FROM registration_links WHERE short_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Function: hash API key
-- ============================================================
CREATE OR REPLACE FUNCTION hash_api_key(p_key TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN ENCODE(DIGEST(p_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Certificate Security Fixes

-- ============================================================
-- 1. Add HMAC hash column to certificates
-- ============================================================
ALTER TABLE certificates
  ADD COLUMN content_hash VARCHAR(64),
  ADD COLUMN token_expires_at TIMESTAMPTZ,
  ADD COLUMN watermark_id VARCHAR(100);

CREATE INDEX idx_cert_content_hash ON certificates(content_hash);
CREATE INDEX idx_cert_watermark ON certificates(watermark_id);

-- ============================================================
-- 2. Template snapshot: store layout at generation time
-- ============================================================
ALTER TABLE certificates
  ADD COLUMN template_snapshot JSONB;

-- ============================================================
-- 3. Download tracking with rate limiting
-- ============================================================
CREATE TABLE certificate_downloads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  ip_address        INET NOT NULL,
  user_agent        TEXT,
  download_type     VARCHAR(20) NOT NULL CHECK (download_type IN ('pdf', 'png', 'zip')),
  downloaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_downloads_cert ON certificate_downloads(certificate_id, downloaded_at DESC);
CREATE INDEX idx_downloads_ip ON certificate_downloads(ip_address, downloaded_at DESC);

-- ============================================================
-- 4. Add expiry to access tokens (nullable = never expires for legacy)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificates'
    AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE certificates ADD COLUMN token_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- 5. Add generation rate limit tracking
-- ============================================================
CREATE TABLE certificate_generation_limits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  generated_count   INT DEFAULT 1,
  window_start      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(client_id, event_id, window_start)
);

-- ============================================================
-- 6. Add share link expiry
-- ============================================================
CREATE TABLE certificate_share_links (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  token             VARCHAR(64) UNIQUE NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  access_count      INT DEFAULT 0,
  max_access        INT DEFAULT 100,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_token ON certificate_share_links(token);

-- ============================================================
-- 7. Function: generate secure certificate number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_certificate_number(p_client_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year INT;
  v_seq INT;
  v_rand VARCHAR(8);
  v_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM now())::INT;
  v_rand := UPPER(encode(gen_random_bytes(4), 'hex'));

  -- Get or create sequence
  INSERT INTO certificate_sequences (client_id, year, last_sequence)
  VALUES (p_client_id, v_year, 0)
  ON CONFLICT (client_id, year) DO NOTHING;

  UPDATE certificate_sequences
  SET last_sequence = last_sequence + 1,
      updated_at = now()
  WHERE client_id = p_client_id AND year = v_year
  RETURNING last_sequence INTO v_seq;

  v_number := 'CERT-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0') || '-' || v_rand;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Function: check generation rate limit
-- ============================================================
CREATE OR REPLACE FUNCTION check_cert_generation_limit(
  p_client_id UUID,
  p_event_id UUID,
  p_limit INT DEFAULT 500,
  p_window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := date_trunc('hour', now());

  SELECT COALESCE(SUM(generated_count), 0) INTO v_count
  FROM certificate_generation_limits
  WHERE client_id = p_client_id
    AND event_id = p_event_id
    AND window_start >= v_window_start;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO certificate_generation_limits (client_id, event_id, generated_count, window_start)
  VALUES (p_client_id, p_event_id, 1, v_window_start)
  ON CONFLICT (client_id, event_id, window_start)
  DO UPDATE SET generated_count = certificate_generation_limits.generated_count + 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Function: check download rate limit
-- ============================================================
CREATE OR REPLACE FUNCTION check_cert_download_limit(
  p_certificate_id UUID,
  p_ip INET,
  p_limit INT DEFAULT 10,
  p_window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM certificate_downloads
  WHERE certificate_id = p_certificate_id
    AND ip_address = p_ip
    AND downloaded_at >= now() - (p_window_minutes || ' minutes')::INTERVAL;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

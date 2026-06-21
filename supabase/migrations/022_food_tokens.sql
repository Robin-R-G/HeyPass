-- ================================================================
-- Migration 022: Food Tokens
-- Tables for meal token distribution and scanning at events
-- ================================================================

-- Food token type definitions (e.g. "Breakfast Day 1", "Lunch")
CREATE TABLE IF NOT EXISTS food_token_types (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  meal_time       VARCHAR(20) NOT NULL CHECK (meal_time IN ('breakfast','lunch','dinner','snack')),
  valid_from      TIMESTAMPTZ,
  valid_to        TIMESTAMPTZ,
  max_uses_per_person INT DEFAULT 1,
  total_quantity  INT,
  used_quantity   INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_food_token_types_event ON food_token_types(event_id, is_active);

-- Individual food tokens issued to registrations
CREATE TABLE IF NOT EXISTS food_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token_type_id   UUID NOT NULL REFERENCES food_token_types(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  ticket_id       UUID REFERENCES tickets(id) ON DELETE SET NULL,
  token_code      VARCHAR(50) UNIQUE NOT NULL,
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','used','cancelled')),
  scanned_at      TIMESTAMPTZ,
  scanned_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  station_id      UUID REFERENCES check_in_stations(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_tokens_event ON food_tokens(event_id, status);
CREATE INDEX IF NOT EXISTS idx_food_tokens_registration ON food_tokens(registration_id);
CREATE INDEX IF NOT EXISTS idx_food_tokens_type ON food_tokens(token_type_id, status);
CREATE INDEX IF NOT EXISTS idx_food_tokens_code ON food_tokens(token_code);

-- RLS
ALTER TABLE food_token_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_tokens ENABLE ROW LEVEL SECURITY;

-- Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('food_token.view','food_token','view','View food tokens'),
  ('food_token.manage','food_token','manage','Manage food tokens'),
  ('food_token.generate','food_token','generate','Generate food tokens'),
  ('food_token.validate','food_token','validate','Validate food tokens')
ON CONFLICT (name) DO NOTHING;

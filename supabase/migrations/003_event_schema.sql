-- Event Management Schema

-- ============================================================
-- EVENT CATEGORIES
-- ============================================================
CREATE TABLE event_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  UNIQUE(client_id, slug)
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES event_categories(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(255),
  description   TEXT,
  event_type    VARCHAR(50) NOT NULL DEFAULT 'conference' CHECK (event_type IN ('conference', 'workshop', 'fest', 'meetup', 'competition', 'seminar', 'other')),
  status        VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  start_date    TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ NOT NULL,
  timezone      VARCHAR(50) NOT NULL DEFAULT 'UTC',
  max_capacity  INT,
  is_virtual    BOOLEAN DEFAULT FALSE,
  virtual_link  VARCHAR(500),
  is_public     BOOLEAN DEFAULT TRUE,
  banner_url    VARCHAR(500),
  thumbnail_url VARCHAR(500),
  created_by    UUID NOT NULL REFERENCES users(id),
  certificate_status VARCHAR(20) DEFAULT 'pending' CHECK (certificate_status IN ('pending', 'generated', 'partial', 'failed')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ,

  UNIQUE(client_id, slug)
);

CREATE INDEX idx_events_client_status ON events(client_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_public ON events(is_public, status) WHERE deleted_at IS NULL;

-- ============================================================
-- EVENT TEMPLATES (Reusable event blueprints)
-- ============================================================
CREATE TABLE event_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  template_data JSONB NOT NULL,
  is_public     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- ============================================================
-- VENUES
-- ============================================================
CREATE TABLE venues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100),
  postal_code   VARCHAR(20),
  latitude      DECIMAL(10,7),
  longitude     DECIMAL(10,7),
  capacity      INT,
  is_virtual    BOOLEAN DEFAULT FALSE,
  virtual_link  VARCHAR(500),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_venues_client ON venues(client_id) WHERE deleted_at IS NULL;

-- ============================================================
-- EVENT VENUES (Multi-venue per event)
-- ============================================================
CREATE TABLE event_venues (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_id  UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, venue_id)
);

-- ============================================================
-- SESSIONS (Sub-events)
-- ============================================================
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  session_type  VARCHAR(50) DEFAULT 'talk' CHECK (session_type IN ('talk', 'workshop', 'panel', 'competition', 'break', 'networking', 'other')),
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  venue_id      UUID REFERENCES venues(id) ON DELETE SET NULL,
  max_capacity  INT,
  track         VARCHAR(100),
  is_required   BOOLEAN DEFAULT FALSE,
  status        VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_sessions_event ON sessions(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_time ON sessions(start_time, end_time);

-- ============================================================
-- SESSION SPEAKERS
-- ============================================================
CREATE TABLE session_speakers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  bio         TEXT,
  photo_url   VARCHAR(500),
  organization VARCHAR(255),
  is_moderator BOOLEAN DEFAULT FALSE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(session_id, user_id)
);

-- ============================================================
-- EVENT CO-HOSTS
-- ============================================================
CREATE TABLE event_co_hosts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name      VARCHAR(255) NOT NULL,
  logo_url  VARCHAR(500),
  website   VARCHAR(500),
  role      VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EVENT TAGS
-- ============================================================
CREATE TABLE event_tags (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag       VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, tag)
);

CREATE INDEX idx_tags_event ON event_tags(event_id);
CREATE INDEX idx_tags_tag ON event_tags(tag);

-- ================================================================
-- Migration 021: Volunteer Management
-- Tables for volunteer registration, task assignment, scheduling
-- ================================================================

-- Volunteer task/shift definitions per event
CREATE TABLE IF NOT EXISTS volunteer_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  location        VARCHAR(255),
  task_type       VARCHAR(50) DEFAULT 'general'
                    CHECK (task_type IN ('general','registration','usher','stage','hospitality','security','transport','media','other')),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  slots_total     INT DEFAULT 1,
  slots_filled    INT DEFAULT 0,
  skills_required JSONB,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vol_tasks_event ON volunteer_tasks(event_id, is_active);

-- Volunteer applications/registrations (public-facing)
CREATE TABLE IF NOT EXISTS volunteer_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(20),
  skills            JSONB,
  availability_json JSONB,
  status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','waitlisted')),
  assigned_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vol_apps_event ON volunteer_applications(event_id, status);
CREATE INDEX IF NOT EXISTS idx_vol_apps_email ON volunteer_applications(event_id, email);

-- Volunteer task assignments with check-in/out
CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  task_id                   UUID NOT NULL REFERENCES volunteer_tasks(id) ON DELETE CASCADE,
  volunteer_application_id  UUID NOT NULL REFERENCES volunteer_applications(id) ON DELETE CASCADE,
  event_id                  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id                 UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status                    VARCHAR(20) DEFAULT 'assigned'
                              CHECK (status IN ('assigned','confirmed','checked_in','checked_out','cancelled','no_show')),
  checked_in_at             TIMESTAMPTZ,
  checked_out_at            TIMESTAMPTZ,
  checked_in_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, volunteer_application_id)
);

CREATE INDEX IF NOT EXISTS idx_vol_assign_task ON volunteer_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_vol_assign_app ON volunteer_assignments(volunteer_application_id);
CREATE INDEX IF NOT EXISTS idx_vol_assign_event ON volunteer_assignments(event_id, status);

-- Volunteer availability preferences
CREATE TABLE IF NOT EXISTS volunteer_availability (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  volunteer_application_id  UUID NOT NULL REFERENCES volunteer_applications(id) ON DELETE CASCADE,
  day_of_week               INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time                TIME NOT NULL,
  end_time                  TIME NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vol_avail_app ON volunteer_availability(volunteer_application_id);

-- RLS
ALTER TABLE volunteer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_availability ENABLE ROW LEVEL SECURITY;

-- Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('volunteer.view','volunteer','view','View volunteers'),
  ('volunteer.manage','volunteer','manage','Manage volunteers'),
  ('volunteer.tasks_manage','volunteer','tasks_manage','Manage volunteer tasks'),
  ('volunteer.communicate','volunteer','communicate','Send communications to volunteers')
ON CONFLICT (name) DO NOTHING;

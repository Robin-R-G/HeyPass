-- Roles & Permissions Schema
-- Defines role-based access control structure

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT FALSE,
  priority    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  UNIQUE(client_id, slug)
);

CREATE INDEX idx_roles_client ON roles(client_id) WHERE deleted_at IS NULL;

-- ============================================================
-- DEFAULT SYSTEM ROLES (Seeded per client)
-- ============================================================
-- Owner:    Full access, can delete client
-- Admin:    Full access to all modules
-- Manager:  Can create/manage events, certificates
-- Volunteer: Can view events, manage check-ins
-- Scanner:  Can only perform check-in/check-out

-- ============================================================
-- PERMISSIONS (Global permission catalog)
-- ============================================================
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  resource    VARCHAR(100) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROLE PERMISSIONS (Role ↔ Permission mapping)
-- ============================================================
CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_perms_role ON role_permissions(role_id);
CREATE INDEX idx_role_perms_perm ON role_permissions(permission_id);

-- ============================================================
-- USER SESSIONS (JWT session tracking)
-- ============================================================
CREATE TABLE user_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  token_hash        VARCHAR(64) NOT NULL,
  refresh_token_hash VARCHAR(64),
  ip_address        INET,
  user_agent        TEXT,
  location          JSONB,
  expires_at        TIMESTAMPTZ NOT NULL,
  last_active_at    TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expiry ON user_sessions(expires_at);

-- ============================================================
-- API KEYS (Per-client API access)
-- ============================================================
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  key_hash    VARCHAR(64) UNIQUE NOT NULL,
  key_prefix  VARCHAR(10) NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_apikeys_client ON api_keys(client_id);
CREATE INDEX idx_apikeys_prefix ON api_keys(key_prefix);

-- ============================================================
-- AUDIT LOGS (Append-only, critical events only)
-- ============================================================
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(50) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   UUID,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    INET,
  user_agent    TEXT,
  request_id    UUID,
  created_at    TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_client_time ON audit_logs(client_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Create monthly partitions for audit_logs
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE audit_logs_2024_03 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE audit_logs_2024_04 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE audit_logs_2024_05 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE audit_logs_2024_06 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE audit_logs_2024_07 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE audit_logs_2024_08 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE audit_logs_2024_09 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE audit_logs_2024_10 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE audit_logs_2024_12 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- ============================================================
-- SEED DEFAULT PERMISSIONS
-- ============================================================
INSERT INTO permissions (name, resource, action, description) VALUES
  -- Client management
  ('client.view', 'client', 'view', 'View client settings'),
  ('client.edit', 'client', 'edit', 'Edit client settings'),
  ('client.delete', 'client', 'delete', 'Delete client'),
  -- User management
  ('users.view', 'users', 'view', 'View users'),
  ('users.invite', 'users', 'invite', 'Invite users'),
  ('users.edit', 'users', 'edit', 'Edit users'),
  ('users.remove', 'users', 'remove', 'Remove users'),
  -- Role management
  ('roles.view', 'roles', 'view', 'View roles'),
  ('roles.create', 'roles', 'create', 'Create roles'),
  ('roles.edit', 'roles', 'edit', 'Edit roles'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),
  -- Event management
  ('events.view', 'events', 'view', 'View events'),
  ('events.create', 'events', 'create', 'Create events'),
  ('events.edit', 'events', 'edit', 'Edit events'),
  ('events.delete', 'events', 'delete', 'Delete events'),
  ('events.publish', 'events', 'publish', 'Publish/unpublish events'),
  ('events.close', 'events', 'close', 'Close events'),
  -- Session management
  ('sessions.view', 'sessions', 'view', 'View sessions'),
  ('sessions.create', 'sessions', 'create', 'Create sessions'),
  ('sessions.edit', 'sessions', 'edit', 'Edit sessions'),
  ('sessions.delete', 'sessions', 'delete', 'Delete sessions'),
  -- Registration management
  ('registrations.view', 'registrations', 'view', 'View registrations'),
  ('registrations.create', 'registrations', 'create', 'Create registrations'),
  ('registrations.edit', 'registrations', 'edit', 'Edit registrations'),
  ('registrations.delete', 'registrations', 'delete', 'Delete registrations'),
  ('registrations.export', 'registrations', 'export', 'Export registrations'),
  -- Ticket management
  ('tickets.view', 'tickets', 'view', 'View tickets'),
  ('tickets.validate', 'tickets', 'validate', 'Validate tickets'),
  ('tickets.transfer', 'tickets', 'transfer', 'Transfer tickets'),
  -- Check-in/Check-out
  ('checkin.perform', 'checkin', 'perform', 'Perform check-in'),
  ('checkin.view', 'checkin', 'view', 'View check-in data'),
  ('checkout.perform', 'checkout', 'perform', 'Perform check-out'),
  ('checkout.view', 'checkout', 'view', 'View check-out data'),
  -- Certificate management
  ('certificates.view', 'certificates', 'view', 'View certificates'),
  ('certificates.generate', 'certificates', 'generate', 'Generate certificates'),
  ('certificates.download', 'certificates', 'download', 'Download certificates'),
  ('certificates.revoke', 'certificates', 'revoke', 'Revoke certificates'),
  ('certificates.templates', 'certificates', 'templates', 'Manage certificate templates'),
  -- Theme & Branding
  ('theme.view', 'theme', 'view', 'View theme settings'),
  ('theme.edit', 'theme', 'edit', 'Edit theme settings'),
  -- Analytics
  ('analytics.view', 'analytics', 'view', 'View analytics'),
  ('analytics.export', 'analytics', 'export', 'Export analytics'),
  -- Billing
  ('billing.view', 'billing', 'view', 'View billing'),
  ('billing.manage', 'billing', 'manage', 'Manage billing'),
  -- Settings
  ('settings.view', 'settings', 'view', 'View settings'),
  ('settings.edit', 'settings', 'edit', 'Edit settings');

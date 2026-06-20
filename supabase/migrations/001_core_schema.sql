-- Core Schema: Multi-Tenant Foundation
-- This migration creates the base tables for the Event Operations SaaS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CLIENTS (Multi-Tenant Container)
-- ============================================================
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  logo_url      VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1D4ED8',
  custom_domain VARCHAR(255) UNIQUE,
  plan_id       UUID,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  max_events    INT DEFAULT 10,
  max_users     INT DEFAULT 25,
  storage_limit_mb INT DEFAULT 1000,
  retention_days INT DEFAULT 1825,
  auto_checkout_grace_minutes INT DEFAULT 30,
  verification_rate_limit INT DEFAULT 50,
  zip_export_limit INT DEFAULT 1000,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_clients_slug ON clients(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_status ON clients(status);

-- ============================================================
-- USERS (Global user accounts)
-- ============================================================
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255),
  phone               VARCHAR(20),
  first_name          VARCHAR(100),
  last_name           VARCHAR(100),
  avatar_url          VARCHAR(500),
  email_verified_at   TIMESTAMPTZ,
  last_login_at       TIMESTAMPTZ,
  failed_login_attempts INT DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  is_superadmin       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- ============================================================
-- CLIENT MEMBERSHIPS (User ↔ Client with Role)
-- ============================================================
CREATE TABLE client_memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID,
  status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_at  TIMESTAMPTZ,
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  UNIQUE(client_id, user_id)
);

CREATE INDEX idx_memberships_client ON client_memberships(client_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_memberships_user ON client_memberships(user_id) WHERE deleted_at IS NULL;

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE subscription_plans (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name                      VARCHAR(100) NOT NULL,
  slug                      VARCHAR(50) UNIQUE NOT NULL,
  description               TEXT,
  price_monthly             DECIMAL(10,2) DEFAULT 0,
  price_yearly              DECIMAL(10,2) DEFAULT 0,
  max_events                INT DEFAULT 10,
  max_users                 INT DEFAULT 25,
  storage_limit_mb          INT DEFAULT 1000,
  regeneration_limit_monthly INT DEFAULT 0,
  regeneration_limit_event  INT DEFAULT 0,
  is_active                 BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

-- ============================================================
-- CLIENT SETTINGS (Per-tenant configuration)
-- ============================================================
CREATE TABLE client_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  certificate_retention_days    INT DEFAULT 1825,
  thumbnail_retention_days      INT DEFAULT 90,
  temp_file_retention_hours     INT DEFAULT 24,
  auto_delete_expired           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id)
);

-- Add foreign key for clients.plan_id
ALTER TABLE clients ADD CONSTRAINT fk_clients_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);

-- ============================================================
-- CLIENT DOMAINS (Custom domain mappings)
-- ============================================================
CREATE TABLE client_domains (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  domain      VARCHAR(255) NOT NULL,
  verified    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(domain)
);

-- ============================================================
-- CLIENT INVITATIONS (Pending member invites)
-- ============================================================
CREATE TABLE client_invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  role_id     UUID,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invitations_token ON client_invitations(token);
CREATE INDEX idx_invitations_email ON client_invitations(email);

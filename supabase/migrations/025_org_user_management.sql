-- ============================================================
-- MIGRATION 025: Organization & User Management System
-- ============================================================
-- Adds: user status, invitation codes, team management columns,
--        pending users view, org approval workflow
-- ============================================================

-- 1. Add status column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'suspended', 'inactive', 'deleted'));

-- Backfill existing users as active
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add password_changed_at for force password change on first login
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Add invitation_code to users (for self-registration with org code)
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code VARCHAR(50);

-- 2. Add invitation_code to clients (org-level invite code)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS invitation_code VARCHAR(50) UNIQUE;

-- Generate unique invitation codes for existing clients
UPDATE clients SET invitation_code = UPPER(LEFT(name, 4)) || '-' || UPPER(SUBSTRING(slug FROM 1 FOR 4)) || '-' || EXTRACT(YEAR FROM created_at)
WHERE invitation_code IS NULL;

-- Add subscription_plan column to clients (for superadmin assignment)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free';

-- 3. Enhance client_memberships with department and phone
ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);

-- 4. Enhance client_invitations with more fields
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS invitation_type VARCHAR(20) DEFAULT 'email'
  CHECK (invitation_type IN ('email', 'link', 'code'));
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS invitation_code VARCHAR(50);
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));
ALTER TABLE client_invitations ADD COLUMN IF NOT EXISTS message TEXT;

-- Add unique constraint on invitation_code for active invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_code_unique
  ON client_invitations(invitation_code) WHERE status = 'pending';

-- 5. Create organization approval queue table
CREATE TABLE IF NOT EXISTS organization_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NOT NULL,
  organization_slug VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for organization_approvals
ALTER TABLE organization_approvals ENABLE ROW LEVEL SECURITY;

-- Superadmins can see all
CREATE POLICY "org_approvals_superadmin_all" ON organization_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND is_superadmin = true)
  );

-- Users can see their own
CREATE POLICY "org_approvals_user_own" ON organization_approvals
  FOR SELECT USING (user_id = get_current_user_id());

-- 6. Create org_settings table for per-org configuration
CREATE TABLE IF NOT EXISTS org_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, setting_key)
);

-- RLS for org_settings
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_settings_client_access" ON org_settings
  FOR ALL USING (client_id = get_current_client_id());

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON client_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_client_status ON client_memberships(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email_status ON client_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_org_approvals_status ON organization_approvals(status);

-- 8. Create function to generate unique invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  counter INT := 0;
BEGIN
  LOOP
    code := UPPER(LEFT(org_name, 3)) || '-' || 
            UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
            EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM clients WHERE invitation_code = code) THEN
      RETURN code;
    END IF;
    
    counter := counter + 1;
    IF counter > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invitation code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to auto-set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_approvals_updated_at') THEN
    CREATE TRIGGER update_org_approvals_updated_at
      BEFORE UPDATE ON organization_approvals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_settings_updated_at') THEN
    CREATE TRIGGER update_org_settings_updated_at
      BEFORE UPDATE ON org_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 10. Seed additional system roles for organization management
DO $$DECLARE
  client_rec RECORD;
  new_role_id UUID;
BEGIN
  FOR client_rec IN SELECT id FROM clients WHERE deleted_at IS NULL LOOP
    -- Finance Manager role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'finance_manager') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Finance Manager', 'finance_manager', 'Manages billing, payments, and financial reports', true, 85)
      RETURNING id INTO new_role_id;
      
      -- Assign billing permissions
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'billing.view', 'billing.manage', 'billing.invoice_download', 'billing.plan_view'
      );
    END IF;

    -- Event Manager role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'event_manager') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Event Manager', 'event_manager', 'Manages events, sessions, and registrations', true, 75)
      RETURNING id INTO new_role_id;
      
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'events.view', 'events.create', 'events.edit', 'events.delete', 'events.publish', 'events.close',
        'sessions.view', 'sessions.create', 'sessions.edit', 'sessions.delete',
        'registrations.view', 'registrations.create', 'registrations.edit', 'registrations.delete', 'registrations.export',
        'tickets.view', 'tickets.validate',
        'analytics.view', 'analytics.export'
      );
    END IF;

    -- Certificate Manager role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'certificate_manager') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Certificate Manager', 'certificate_manager', 'Manages certificate templates and generation', true, 65)
      RETURNING id INTO new_role_id;
      
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'certificates.view', 'certificates.generate', 'certificates.download', 'certificates.revoke',
        'certificates.templates', 'certificate.regenerate', 'certificate.export', 'certificate.verify',
        'certificate.upload_assets', 'certificate.configure_defaults'
      );
    END IF;

    -- Volunteer Coordinator role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'volunteer_coordinator') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Volunteer Coordinator', 'volunteer_coordinator', 'Manages volunteers, tasks, and schedules', true, 60)
      RETURNING id INTO new_role_id;
      
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'volunteer.view', 'volunteer.manage', 'volunteer.tasks_manage', 'volunteer.communicate',
        'events.view', 'sessions.view', 'registrations.view'
      );
    END IF;

    -- Sponsor Manager role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'sponsor_manager') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Sponsor Manager', 'sponsor_manager', 'Manages sponsors and sponsor analytics', true, 55)
      RETURNING id INTO new_role_id;
      
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'events.view', 'analytics.view', 'analytics.export'
      );
    END IF;

    -- Read Only role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'read_only') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Read Only', 'read_only', 'View-only access to organization data', true, 10)
      RETURNING id INTO new_role_id;
      
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'events.view', 'registrations.view', 'tickets.view', 'certificates.view', 'analytics.view'
      );
    END IF;

    -- Participant role (for external users)
    IF NOT EXISTS (SELECT 1 FROM roles WHERE client_id = client_rec.id AND slug = 'participant') THEN
      INSERT INTO roles (client_id, name, slug, description, is_system, priority)
      VALUES (client_rec.id, 'Participant', 'participant', 'External participant with limited access', true, 5)
      RETURNING id INTO new_role_id;
      
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT new_role_id, id FROM permissions WHERE name IN (
        'events.view', 'tickets.view', 'certificates.view', 'certificates.download'
      );
    END IF;
  END LOOP;
END$$;

-- Done
SELECT 'Migration 025 completed: Organization & User Management system added' AS result;

-- RBAC: Seed Role-Permissions Mapping
-- Adds granular permissions and maps them to system roles

-- ============================================================
-- INSERT ADDITIONAL PERMISSIONS (beyond those in 002)
-- ============================================================

INSERT INTO permissions (name, resource, action, description) VALUES
  -- User management (granular)
  ('user.role_assign',     'user',     'role_assign',   'Assign or change user roles'),
  ('user.impersonate',     'user',     'impersonate',   'Log in as another user'),

  -- Event management (granular)
  ('event.manage_staff',   'event',    'manage_staff',  'Assign staff to events'),
  ('event.configure_branding', 'event', 'configure_branding', 'Configure event branding'),

  -- Registration management (granular)
  ('registration.approve', 'registration', 'approve',   'Approve or deny registrations'),
  ('registration.refund',  'registration', 'refund',    'Process refunds'),
  ('registration.cancel',  'registration', 'cancel',    'Cancel registrations'),
  ('registration.waitlist_view',   'registration', 'waitlist_view',   'View waitlist'),
  ('registration.waitlist_promote', 'registration', 'waitlist_promote', 'Promote from waitlist'),

  -- Coupon management
  ('coupon.create',  'coupon', 'create', 'Create discount coupons'),
  ('coupon.view',    'coupon', 'view',   'View coupons'),
  ('coupon.delete',  'coupon', 'delete', 'Delete coupons'),

  -- Ticket management (granular)
  ('ticket.scan',     'ticket', 'scan',     'Scan tickets for check-in'),
  ('ticket.checkout', 'ticket', 'checkout', 'Perform check-out'),
  ('ticket.override', 'ticket', 'override', 'Override check-in errors'),

  -- Check-in (granular)
  ('checkin.override', 'checkin', 'override', 'Override check-in errors'),
  ('checkin.export',   'checkin', 'export',   'Export check-in data'),
  ('checkin.offline_upload', 'checkin', 'offline_upload', 'Upload offline scan data'),

  -- Check-out (granular)
  ('checkout.manual', 'checkout', 'manual', 'Perform manual check-out'),
  ('checkout.export', 'checkout', 'export', 'Export check-out data'),
  ('checkout.auto_configure', 'checkout', 'auto_configure', 'Configure auto check-out'),

  -- Attendance
  ('attendance.view',   'attendance', 'view',   'View attendance report'),
  ('attendance.export', 'attendance', 'export', 'Export attendance data'),

  -- Certificate management (granular)
  ('certificate.regenerate', 'certificate', 'regenerate', 'Regenerate certificates'),
  ('certificate.export',     'certificate', 'export',     'Export certificates as ZIP'),
  ('certificate.verify',     'certificate', 'verify',     'Verify certificates (public)'),
  ('certificate.upload_assets', 'certificate', 'upload_assets', 'Upload certificate assets'),
  ('certificate.configure_defaults', 'certificate', 'configure_defaults', 'Set certificate defaults'),

  -- Verification
  ('verification.configure', 'verification', 'configure', 'Configure verification settings'),
  ('verification.logs_view', 'verification', 'logs_view', 'View verification logs'),

  -- Audit
  ('audit.view',   'audit', 'view',   'View audit logs'),
  ('audit.export', 'audit', 'export', 'Export audit logs'),

  -- API Keys
  ('apikey.view',   'apikey', 'view',   'View API keys'),
  ('apikey.create', 'apikey', 'create', 'Create API keys'),
  ('apikey.revoke', 'apikey', 'revoke', 'Revoke API keys'),

  -- Webhooks
  ('webhook.view',   'webhook', 'view',   'View webhook configurations'),
  ('webhook.manage', 'webhook', 'manage', 'Create/edit/delete webhooks'),

  -- Data export
  ('data.export', 'data', 'export', 'Export all platform data'),

  -- Billing (granular)
  ('billing.invoice_download', 'billing', 'invoice_download', 'Download invoices'),
  ('billing.plan_view',        'billing', 'plan_view',        'View subscription/plan'),
  ('billing.plan_change',      'billing', 'plan_change',      'Change subscription plan'),
  ('billing.cancel',           'billing', 'cancel',           'Cancel subscription'),

  -- Email
  ('email.template_view',   'email', 'template_view',   'View email templates'),
  ('email.template_manage', 'email', 'template_manage', 'Create/edit email templates'),

  -- Branding
  ('branding.update', 'branding', 'update', 'Update client branding (logo, colors)');

-- ============================================================
-- FUNCTION: Seed role_permissions for a client
-- ============================================================

CREATE OR REPLACE FUNCTION seed_role_permissions(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id   UUID;
  v_admin_id   UUID;
  v_manager_id UUID;
  v_volunteer_id UUID;
  v_scanner_id UUID;
BEGIN
  -- Get role IDs for this client
  SELECT id INTO v_owner_id   FROM roles WHERE client_id = p_client_id AND slug = 'owner'   AND deleted_at IS NULL;
  SELECT id INTO v_admin_id   FROM roles WHERE client_id = p_client_id AND slug = 'admin'   AND deleted_at IS NULL;
  SELECT id INTO v_manager_id FROM roles WHERE client_id = p_client_id AND slug = 'manager' AND deleted_at IS NULL;
  SELECT id INTO v_volunteer_id FROM roles WHERE client_id = p_client_id AND slug = 'volunteer' AND deleted_at IS NULL;
  SELECT id INTO v_scanner_id FROM roles WHERE client_id = p_client_id AND slug = 'scanner' AND deleted_at IS NULL;

  -- ============================================================
  -- OWNER: All permissions
  -- ============================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_owner_id, id FROM permissions;

  -- ============================================================
  -- ADMIN: All except impersonate, role create/delete, client delete, billing plan change/cancel
  -- ============================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_admin_id, id FROM permissions
  WHERE name NOT IN (
    'user.impersonate',
    'roles.create',
    'roles.delete',
    'client.delete',
    'billing.plan_change',
    'billing.cancel'
  );

  -- ============================================================
  -- MANAGER: Event Ops + Registrations + Certificates + Some settings
  -- ============================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_manager_id, id FROM permissions
  WHERE name IN (
    -- Client
    'client.view',
    -- Users
    'users.view', 'users.invite',
    -- Roles
    'roles.view',
    -- Events
    'events.view', 'events.create', 'events.edit', 'events.publish', 'events.close',
    'event.manage_staff', 'event.configure_branding',
    -- Sessions
    'sessions.view', 'sessions.create', 'sessions.edit',
    -- Registrations
    'registrations.view', 'registrations.create', 'registrations.edit', 'registrations.export',
    'registration.approve', 'registration.cancel',
    'registration.waitlist_view', 'registration.waitlist_promote',
    -- Coupons
    'coupon.create', 'coupon.view',
    -- Tickets
    'tickets.view', 'tickets.validate', 'tickets.scan',
    'ticket.scan', 'ticket.checkout', 'ticket.override',
    -- Check-in
    'checkin.perform', 'checkin.view', 'checkin.override', 'checkin.export', 'checkin.offline_upload',
    -- Check-out
    'checkout.perform', 'checkout.view', 'checkout.manual', 'checkout.export', 'checkout.auto_configure',
    -- Attendance
    'attendance.view', 'attendance.export',
    -- Certificates
    'certificates.view', 'certificates.generate', 'certificates.download', 'certificates.templates',
    'certificate.regenerate', 'certificate.export', 'certificate.verify', 'certificate.upload_assets',
    -- Verification
    'verification.configure', 'verification.logs_view',
    -- Theme
    'theme.view', 'theme.edit',
    -- Analytics
    'analytics.view', 'analytics.export',
    -- Settings
    'settings.view', 'settings.edit',
    -- Audit
    'audit.view',
    -- Email
    'email.template_view', 'email.template_manage',
    -- Webhooks
    'webhook.view', 'webhook.manage',
    -- Data
    'data.export',
    -- Billing
    'billing.view', 'billing.invoice_download', 'billing.plan_view'
  );

  -- ============================================================
  -- VOLUNTEER: View events, manage check-ins, basic cert stuff
  -- ============================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_volunteer_id, id FROM permissions
  WHERE name IN (
    -- Events
    'events.view',
    -- Sessions
    'sessions.view',
    -- Registrations
    'registrations.view',
    'registration.waitlist_view',
    -- Tickets
    'tickets.view', 'tickets.validate',
    'ticket.scan',
    -- Check-in
    'checkin.perform', 'checkin.view', 'checkin.offline_upload',
    -- Check-out
    'checkout.perform', 'checkout.view',
    -- Attendance
    'attendance.view',
    -- Certificates
    'certificates.view', 'certificates.generate', 'certificates.download', 'certificate.verify',
    -- Verification
    'verification.logs_view',
    -- Theme
    'theme.view',
    -- Settings
    'settings.view'
  );

  -- ============================================================
  -- SCANNER: Only check-in/out and ticket scan
  -- ============================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_scanner_id, id FROM permissions
  WHERE name IN (
    'events.view',
    'tickets.view',
    'ticket.scan',
    'checkin.perform', 'checkin.offline_upload',
    'certificate.verify'
  );
END;
$$;

-- ============================================================
-- TRIGGER: Auto-seed role_permissions after client creation
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_seed_role_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM seed_role_permissions(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger on clients
DROP TRIGGER IF EXISTS after_client_insert_role_perms ON clients;
CREATE TRIGGER after_client_insert_role_perms
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_role_permissions();

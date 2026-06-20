-- Row Level Security Policies

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_co_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE regeneration_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS HELPER FUNCTION
-- ============================================================
-- Returns the current user's client_id from the JWT
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'client_id', '')::UUID;
$$;

-- Returns the current user's ID from the JWT
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::json->>'sub', '')::UUID;
$$;

-- Returns the current user's role slug for the current client
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR(50)
LANGUAGE SQL
STABLE
AS $$
  SELECT r.slug
  FROM client_memberships cm
  JOIN roles r ON r.id = cm.role_id
  WHERE cm.user_id = get_current_user_id()
    AND cm.client_id = get_current_client_id()
    AND cm.status = 'active'
    AND cm.deleted_at IS NULL;
$$;

-- Check if current user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(p_permission_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN roles r ON r.id = rp.role_id
    JOIN client_memberships cm ON cm.role_id = r.id
    WHERE cm.user_id = get_current_user_id()
      AND cm.client_id = get_current_client_id()
      AND cm.status = 'active'
      AND cm.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND p.name = p_permission_name
  );
$$;

-- ============================================================
-- CLIENTS POLICIES
-- ============================================================
-- Users can see their own client
CREATE POLICY client_select ON clients
  FOR SELECT
  USING (
    id IN (
      SELECT client_id FROM client_memberships
      WHERE user_id = get_current_user_id()
        AND status = 'active'
        AND deleted_at IS NULL
    )
  );

-- Only Owner/Admin can update client
CREATE POLICY client_update ON clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_memberships cm
      JOIN roles r ON r.id = cm.role_id
      WHERE cm.user_id = get_current_user_id()
        AND cm.client_id = clients.id
        AND cm.status = 'active'
        AND r.slug IN ('owner', 'admin')
        AND cm.deleted_at IS NULL
    )
  );

-- ============================================================
-- CLIENT-SCOPED TABLES (Generic Pattern)
-- ============================================================
-- Generic policy for SELECT on tables with client_id
CREATE OR REPLACE FUNCTION create_client_select_policy()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Applied individually per table below
END;
$$;

-- ============================================================
-- EVENTS POLICIES
-- ============================================================
CREATE POLICY events_select ON events
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      is_public = TRUE
      OR EXISTS (
        SELECT 1 FROM client_memberships
        WHERE user_id = get_current_user_id()
          AND client_id = events.client_id
          AND status = 'active'
          AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY events_insert ON events
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('events.create')
  );

CREATE POLICY events_update ON events
  FOR UPDATE
  USING (
    client_id = get_current_client_id()
    AND has_permission('events.edit')
  );

CREATE POLICY events_delete ON events
  FOR DELETE
  USING (
    client_id = get_current_client_id()
    AND has_permission('events.delete')
  );

-- ============================================================
-- REGISTRATIONS POLICIES
-- ============================================================
CREATE POLICY registrations_select ON registrations
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      email = current_setting('request.jwt.claims', TRUE)::json->>'email'
      OR has_permission('registrations.view')
    )
  );

CREATE POLICY registrations_insert ON registrations
  FOR INSERT
  WITH CHECK (
    has_permission('registrations.create')
  );

CREATE POLICY registrations_update ON registrations
  FOR UPDATE
  USING (
    client_id = get_current_client_id()
    AND has_permission('registrations.edit')
  );

-- ============================================================
-- TICKETS POLICIES
-- ============================================================
CREATE POLICY tickets_select ON tickets
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      -- Owner of the ticket can see
      registration_id IN (
        SELECT id FROM registrations WHERE email = current_setting('request.jwt.claims', TRUE)::json->>'email'
      )
      OR has_permission('tickets.view')
    )
  );

CREATE POLICY tickets_update ON tickets
  FOR UPDATE
  USING (
    client_id = get_current_client_id()
    AND has_permission('tickets.validate')
  );

-- ============================================================
-- CHECK-IN/CHECK-OUT POLICIES
-- ============================================================
CREATE POLICY checkins_select ON check_ins
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      has_permission('checkin.view')
      OR staff_id = get_current_user_id()
    )
  );

CREATE POLICY checkins_insert ON check_ins
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('checkin.perform')
  );

CREATE POLICY checkouts_select ON check_outs
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      has_permission('checkout.view')
      OR staff_id = get_current_user_id()
    )
  );

CREATE POLICY checkouts_insert ON check_outs
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('checkout.perform')
  );

-- ============================================================
-- CERTIFICATES POLICIES
-- ============================================================
CREATE POLICY certificates_select ON certificates
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      -- Certificate owner can view
      registration_id IN (
        SELECT id FROM registrations WHERE email = current_setting('request.jwt.claims', TRUE)::json->>'email'
      )
      OR has_permission('certificates.view')
    )
  );

CREATE POLICY certificates_generate ON certificates
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('certificates.generate')
  );

CREATE POLICY certificates_revoke ON certificates
  FOR UPDATE
  USING (
    client_id = get_current_client_id()
    AND has_permission('certificates.revoke')
  );

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================
CREATE POLICY audit_select ON audit_logs
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND has_permission('settings.view')
  );

CREATE POLICY audit_insert ON audit_logs
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    -- Service role bypasses this
  );

-- ============================================================
-- USERS POLICIES (Self-service)
-- ============================================================
CREATE POLICY users_select ON users
  FOR SELECT
  USING (
    id = get_current_user_id()
    OR id IN (
      SELECT user_id FROM client_memberships
      WHERE client_id = get_current_client_id()
        AND deleted_at IS NULL
    )
  );

CREATE POLICY users_update ON users
  FOR UPDATE
  USING (id = get_current_user_id());

-- ============================================================
-- CLIENT MEMBERSHIPS POLICIES
-- ============================================================
CREATE POLICY memberships_select ON client_memberships
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      user_id = get_current_user_id()
      OR has_permission('users.view')
    )
  );

CREATE POLICY memberships_invite ON client_memberships
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('users.invite')
  );

-- ============================================================
-- SESSIONS POLICIES
-- ============================================================
CREATE POLICY sessions_select ON sessions
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND (
      has_permission('sessions.view')
      OR event_id IN (
        SELECT id FROM events WHERE is_public = TRUE
      )
    )
  );

CREATE POLICY sessions_insert ON sessions
  FOR INSERT
  WITH CHECK (
    client_id = get_current_client_id()
    AND has_permission('sessions.create')
  );

-- ============================================================
-- CERTIFICATE TEMPLATES POLICIES
-- ============================================================
CREATE POLICY templates_select ON certificate_templates
  FOR SELECT
  USING (
    client_id = get_current_client_id()
  );

CREATE POLICY templates_manage ON certificate_templates
  FOR ALL
  USING (
    client_id = get_current_client_id()
    AND has_permission('certificates.templates')
  );

-- ============================================================
-- CERTIFICATE VERIFICATIONS (Public access for verification)
-- ============================================================
-- Certificate verification is public by design
-- Only needs rate limiting, not RLS
CREATE POLICY verifications_select ON certificate_verifications
  FOR SELECT
  USING (
    client_id = get_current_client_id()
    AND has_permission('certificates.view')
  );

CREATE POLICY verifications_insert ON certificate_verifications
  FOR INSERT
  WITH CHECK (TRUE);

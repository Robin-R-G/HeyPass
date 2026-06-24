-- Fix: Add missing INSERT policy for clients table
-- The service_role should bypass RLS, but this policy ensures
-- superadmins can also insert via regular auth if needed.

-- Allow INSERT for superadmins (is_superadmin claim in JWT)
CREATE POLICY client_insert ON clients
  FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', TRUE)::json->>'is_superadmin' = 'true'
  );

-- Also add a superadmin-friendly SELECT policy so they can see all clients
DROP POLICY IF EXISTS client_select ON clients;
CREATE POLICY client_select ON clients
  FOR SELECT
  USING (
    -- Members can see their own clients
    id IN (
      SELECT client_id FROM client_memberships
      WHERE user_id = get_current_user_id()
        AND status = 'active'
        AND deleted_at IS NULL
    )
    -- Superadmins can see all clients
    OR current_setting('request.jwt.claims', TRUE)::json->>'is_superadmin' = 'true'
  );

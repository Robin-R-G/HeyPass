-- ============================================================
-- Setup Script: Make metherobin@gmail.com the platform admin
-- Run this in Supabase SQL Editor AFTER registering via the UI
-- ============================================================

-- 1. Find the user
DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_admin_role_id UUID;
  v_membership_exists BOOLEAN;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'metherobin@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User metherobin@gmail.com not found. Please register first via the UI.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Check if user already has a client membership
  SELECT EXISTS(
    SELECT 1 FROM client_memberships
    WHERE user_id = v_user_id AND deleted_at IS NULL
  ) INTO v_membership_exists;

  IF v_membership_exists THEN
    RAISE NOTICE 'User already has a client membership.';
  ELSE
    RAISE NOTICE 'No client membership found. Create an organization first via the dashboard.';
  END IF;

  -- If user has a client, update their role to admin
  FOR v_client_id IN
    SELECT cm.client_id FROM client_memberships cm WHERE cm.user_id = v_user_id AND cm.deleted_at IS NULL
  LOOP
    -- Find the admin role for this client
    SELECT id INTO v_admin_role_id
    FROM roles
    WHERE client_id = v_client_id AND slug = 'admin' AND deleted_at IS NULL;

    IF v_admin_role_id IS NOT NULL THEN
      UPDATE client_memberships
      SET role_id = v_admin_role_id, updated_at = NOW()
      WHERE user_id = v_user_id AND client_id = v_client_id AND deleted_at IS NULL;

      RAISE NOTICE 'Updated role to admin for client %', v_client_id;
    ELSE
      RAISE NOTICE 'Admin role not found for client %. Run the migration first.', v_client_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done!';
END $$;

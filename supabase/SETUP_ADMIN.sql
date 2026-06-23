-- ============================================================
-- Setup: Make metherobin@gmail.com and therobinrg@gmail.com
--        Owners of their organizations
-- Run in Supabase SQL Editor AFTER registering via the UI
-- ============================================================

-- Step 1: For each user, update their role to owner
DO $$
DECLARE
  v_rec RECORD;
  v_owner_role_id UUID;
BEGIN
  FOR v_rec IN
    SELECT
      au.id AS user_id,
      au.email,
      cm.client_id,
      r.slug AS current_role
    FROM auth.users au
    JOIN client_memberships cm ON cm.user_id = au.id AND cm.deleted_at IS NULL
    JOIN roles r ON r.id = cm.role_id AND r.deleted_at IS NULL
    WHERE au.email IN ('metherobin@gmail.com', 'therobinrg@gmail.com')
  LOOP
    -- Find the owner role for this client
    SELECT id INTO v_owner_role_id
    FROM roles
    WHERE client_id = v_rec.client_id AND slug = 'owner' AND deleted_at IS NULL;

    IF v_owner_role_id IS NULL THEN
      RAISE WARNING 'Owner role not found for client % (user %)', v_rec.client_id, v_rec.email;
      CONTINUE;
    END IF;

    IF v_rec.current_role = 'owner' THEN
      RAISE NOTICE '% is already owner of client %. Skipping.', v_rec.email, v_rec.client_id;
    ELSE
      UPDATE client_memberships
      SET role_id = v_owner_role_id, updated_at = NOW()
      WHERE user_id = v_rec.user_id AND client_id = v_rec.client_id AND deleted_at IS NULL;

      RAISE NOTICE 'Set % as OWNER of client % (was %)', v_rec.email, v_rec.client_id, v_rec.current_role;
    END IF;
  END LOOP;

  -- Show status
  RAISE NOTICE '---';
  FOR v_rec IN
    SELECT
      au.email,
      c.name AS client_name,
      r.slug AS role
    FROM auth.users au
    JOIN client_memberships cm ON cm.user_id = au.id AND cm.deleted_at IS NULL
    JOIN roles r ON r.id = cm.role_id AND r.deleted_at IS NULL
    JOIN clients c ON c.id = cm.client_id
    WHERE au.email IN ('metherobin@gmail.com', 'therobinrg@gmail.com')
  LOOP
    RAISE NOTICE '% → % (role: %)', v_rec.email, v_rec.client_name, v_rec.role;
  END LOOP;
END $$;

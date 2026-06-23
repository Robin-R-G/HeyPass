-- ============================================================
-- SETUP: Make therobinrg@gmail.com a platform owner
-- Run AFTER this user registers via the UI
-- ============================================================

-- 1. Set as superadmin
UPDATE public.users SET is_superadmin = true WHERE email = 'therobinrg@gmail.com';

-- 2. Add as owner of the platform client
INSERT INTO client_memberships (id, client_id, user_id, role_id, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'cbf1afa1-7a01-4e68-af50-e11c1537ae36',
  (SELECT id FROM public.users WHERE email = 'therobinrg@gmail.com'),
  (SELECT id FROM roles WHERE client_id = 'cbf1afa1-7a01-4e68-af50-e11c1537ae36' AND slug = 'owner' AND deleted_at IS NULL),
  'active',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM client_memberships
  WHERE user_id = (SELECT id FROM public.users WHERE email = 'therobinrg@gmail.com')
  AND client_id = 'cbf1afa1-7a01-4e68-af50-e11c1537ae36'
);

DO $$
DECLARE
  v_user_id UUID := 'beaacbe9-e82c-49a0-bb55-a2f26b4f738a';
  v_client_id UUID;
  v_owner_role_id UUID;
BEGIN
  -- Create a default client/organization for this user
  INSERT INTO clients (id, name, slug, owner_id, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Robin''s Organization',
    'robin-org',
    v_user_id,
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_client_id;

  RAISE NOTICE 'Created client: %', v_client_id;

  -- Seed roles for this client
  INSERT INTO roles (client_id, name, slug, description, is_system, priority) VALUES
    (v_client_id, 'Owner', 'owner', 'Full access, can delete client', TRUE, 100),
    (v_client_id, 'Admin', 'admin', 'Full access to all modules', TRUE, 90),
    (v_client_id, 'Manager', 'manager', 'Can create and manage events', TRUE, 70),
    (v_client_id, 'Volunteer', 'volunteer', 'Can manage check-ins and view events', TRUE, 50),
    (v_client_id, 'Scanner', 'scanner', 'Can only perform check-in/check-out', TRUE, 30);

  -- Get the owner role
  SELECT id INTO v_owner_role_id FROM roles WHERE client_id = v_client_id AND slug = 'owner' AND deleted_at IS NULL;

  -- Add user as owner member
  INSERT INTO client_memberships (id, client_id, user_id, role_id, status, created_at, updated_at)
  VALUES (gen_random_uuid(), v_client_id, v_user_id, v_owner_role_id, 'active', NOW(), NOW());

  RAISE NOTICE 'Added user as OWNER of client %', v_client_id;

  -- Seed certificate types
  INSERT INTO certificate_types (client_id, name, slug, description) VALUES
    (v_client_id, 'Participation', 'participation', 'Standard participation certificate'),
    (v_client_id, 'Volunteer', 'volunteer', 'Volunteer service certificate'),
    (v_client_id, 'Organizer', 'organizer', 'Organizer recognition certificate'),
    (v_client_id, 'Speaker', 'speaker', 'Speaker appreciation certificate'),
    (v_client_id, 'Winner', 'winner', 'Winner award certificate'),
    (v_client_id, 'Runner-Up', 'runner-up', 'Runner-up achievement certificate');

  RAISE NOTICE 'Setup complete for metherobin@gmail.com as Owner';
END $$;

-- Helper Functions & Triggers

-- ============================================================
-- UUIDv7 Generation Function
-- ============================================================
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID
LANGUAGE SQL
PARALLEL SAFE
AS $$
  SELECT encode(
    set_byte(
      set_byte(
        set_byte(
          set_byte(
            substring(gen_random_bytes(16)::text::bytea from 1 for 16),
            6,
            (get_byte(substring(gen_random_bytes(16)::text::bytea from 1 for 16), 6) & 0x0f) | 0x70
          ),
          8,
          (get_byte(substring(gen_random_bytes(16)::text::bytea from 1 for 16), 8) & 0x3f) | 0x80
        ),
        6,
        (extract(epoch from clock_timestamp()) * 1000)::bigint >> 40
      ),
      7,
      (extract(epoch from clock_timestamp()) * 1000)::bigint >> 32
    )::bytea,
    'hex'
  )::uuid;
$$;

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_client_memberships_updated_at BEFORE UPDATE ON client_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Generate Certificate Number Function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_certificate_number(p_client_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INT;
  v_seq INT;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::INT;

  INSERT INTO certificate_sequences (client_id, year, last_sequence)
  VALUES (p_client_id, v_year, 1)
  ON CONFLICT (client_id, year)
  DO UPDATE SET last_sequence = certificate_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  RETURN 'CERT-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- ============================================================
-- Calculate Attendance Function
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_attendance(p_registration_id UUID)
RETURNS TABLE (
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  duration_minutes INT,
  attendance_percentage DECIMAL(5,2),
  is_eligible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check_in TIMESTAMPTZ;
  v_check_out TIMESTAMPTZ;
  v_event_start TIMESTAMPTZ;
  v_event_end TIMESTAMPTZ;
  v_event_duration INT;
  v_actual_duration INT;
  v_percentage DECIMAL(5,2);
BEGIN
  -- Get check-in/out times
  SELECT ci.scanned_at INTO v_check_in
  FROM check_ins ci
  WHERE ci.registration_id = p_registration_id AND ci.scan_type = 'check_in'
  ORDER BY ci.scanned_at ASC
  LIMIT 1;

  SELECT co.scanned_at INTO v_check_out
  FROM check_outs co
  WHERE co.registration_id = p_registration_id
  ORDER BY co.scanned_at DESC
  LIMIT 1;

  -- Get event times
  SELECT e.start_date, e.end_date INTO v_event_start, v_event_end
  FROM registrations r
  JOIN events e ON e.id = r.event_id
  WHERE r.id = p_registration_id;

  -- Calculate duration
  IF v_check_in IS NULL THEN
    RETURN QUERY SELECT NULL, NULL, 0, 0.00, FALSE;
    RETURN;
  END IF;

  IF v_check_out IS NULL THEN
    v_check_out := v_event_end;
  END IF;

  v_actual_duration := EXTRACT(EPOCH FROM (v_check_out - v_check_in)) / 60;
  v_event_duration := GREATEST(EXTRACT(EPOCH FROM (v_event_end - v_event_start)) / 60, 1);
  v_percentage := ROUND((v_actual_duration::DECIMAL / v_event_duration::DECIMAL) * 100, 2);
  v_percentage := LEAST(v_percentage, 100.00);

  -- Update attendance_summary
  INSERT INTO attendance_summary (client_id, event_id, registration_id, check_in_time, check_out_time, duration_minutes, attendance_percentage, is_eligible, last_calculated_at)
  SELECT
    r.client_id, r.event_id, r.id,
    v_check_in, v_check_out, v_actual_duration, v_percentage,
    v_percentage >= 50.00,
    now()
  FROM registrations r
  WHERE r.id = p_registration_id
  ON CONFLICT (registration_id)
  DO UPDATE SET
    check_in_time = v_check_in,
    check_out_time = v_check_out,
    duration_minutes = v_actual_duration,
    attendance_percentage = v_percentage,
    is_eligible = v_percentage >= 50.00,
    last_calculated_at = now();

  RETURN QUERY SELECT v_check_in, v_check_out, v_actual_duration, v_percentage, v_percentage >= 50.00;
END;
$$;

-- ============================================================
-- Auto Check-Out Function
-- ============================================================
CREATE OR REPLACE FUNCTION auto_checkout_event(p_event_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  v_client_id UUID;
  v_event_end TIMESTAMPTZ;
BEGIN
  SELECT e.client_id, e.end_date INTO v_client_id, v_event_end
  FROM events e WHERE e.id = p_event_id;

  -- Find all checked-in registrations without check-out
  FOR r IN SELECT ci.registration_id, ci.ticket_id, ci.id AS check_in_id
           FROM check_ins ci
           WHERE ci.event_id = p_event_id
             AND ci.scan_type = 'check_in'
             AND ci.registration_id NOT IN (
               SELECT DISTINCT co.registration_id FROM check_outs co WHERE co.event_id = p_event_id
             )
           GROUP BY ci.registration_id, ci.ticket_id, ci.id
  LOOP
    INSERT INTO check_outs (client_id, event_id, check_in_id, registration_id, ticket_id, scanned_at, auto_checkout, duration_minutes)
    VALUES (v_client_id, p_event_id, r.check_in_id, r.registration_id, r.ticket_id, v_event_end, TRUE,
            EXTRACT(EPOCH FROM (v_event_end - (SELECT scanned_at FROM check_ins WHERE id = r.check_in_id))) / 60);

    UPDATE registrations SET
      checked_out_at = v_event_end,
      status = 'checked_out',
      updated_at = now()
    WHERE id = r.registration_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- Seed Default Roles for New Client
-- ============================================================
CREATE OR REPLACE FUNCTION seed_client_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO roles (client_id, name, slug, description, is_system, priority) VALUES
    (NEW.id, 'Owner', 'owner', 'Full access, can delete client', TRUE, 100),
    (NEW.id, 'Admin', 'admin', 'Full access to all modules', TRUE, 90),
    (NEW.id, 'Manager', 'manager', 'Can create and manage events', TRUE, 70),
    (NEW.id, 'Volunteer', 'volunteer', 'Can manage check-ins and view events', TRUE, 50),
    (NEW.id, 'Scanner', 'scanner', 'Can only perform check-in/check-out', TRUE, 30);

  INSERT INTO certificate_types (client_id, name, slug, description) VALUES
    (NEW.id, 'Participation', 'participation', 'Standard participation certificate'),
    (NEW.id, 'Volunteer', 'volunteer', 'Volunteer service certificate'),
    (NEW.id, 'Organizer', 'organizer', 'Organizer recognition certificate'),
    (NEW.id, 'Speaker', 'speaker', 'Speaker appreciation certificate'),
    (NEW.id, 'Winner', 'winner', 'Winner award certificate'),
    (NEW.id, 'Runner-Up', 'runner-up', 'Runner-up achievement certificate');

  RETURN NEW;
END;
$$;

CREATE TRIGGER after_client_insert
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION seed_client_roles();

-- ============================================================
-- Assign Owner Role on First Membership
-- ============================================================
CREATE OR REPLACE FUNCTION assign_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If this is the first member, assign Owner role
  IF (SELECT COUNT(*) FROM client_memberships WHERE client_id = NEW.client_id AND deleted_at IS NULL) = 0 THEN
    SELECT id INTO NEW.role_id FROM roles WHERE client_id = NEW.client_id AND slug = 'owner' AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_client_membership_insert
  BEFORE INSERT ON client_memberships
  FOR EACH ROW
  EXECUTE FUNCTION assign_owner_role();

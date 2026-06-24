-- ================================================================
-- Migration 025: CRM Contacts and WhatsApp Platform Integration
-- ================================================================

-- 1. Create CRM Contacts Table
CREATE TABLE IF NOT EXISTS crm_contacts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  phone             VARCHAR(50),
  email             VARCHAR(255),
  organization      VARCHAR(255),
  designation       VARCHAR(255),
  tags              JSONB DEFAULT '[]',
  notes             TEXT,
  source            VARCHAR(255) DEFAULT 'registration',
  status            VARCHAR(50) DEFAULT 'active',
  engagement_score  INT DEFAULT 0,
  interests         JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- Unique constraints to identify unique contacts per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_tenant_email ON crm_contacts(tenant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_tenant_phone ON crm_contacts(tenant_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- 2. Alter existing tables to reference CRM Contacts
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;
ALTER TABLE volunteer_applications ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;
ALTER TABLE session_speakers ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;

-- 3. Create Event Feedback Table
CREATE TABLE IF NOT EXISTS event_feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(registration_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_event ON event_feedback(event_id);

-- 4. Create WhatsApp Templates Table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  category        VARCHAR(50) NOT NULL CHECK (category IN ('utility', 'marketing', 'authentication')),
  language        VARCHAR(10) DEFAULT 'en',
  status          VARCHAR(20) DEFAULT 'approved',
  body_text       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, name)
);

-- 5. Create WhatsApp Campaigns Table
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  template_id     UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  target_segment  VARCHAR(50) NOT NULL CHECK (target_segment IN ('all', 'checked_in', 'absent', 'volunteers', 'staff', 'speakers', 'sponsors', 'custom')),
  segment_filters JSONB,
  status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_count      INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count      INT DEFAULT 0,
  failed_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. Create WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  message_id      VARCHAR(255) PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  campaign_id     UUID REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_text    TEXT,
  status          VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  direction       VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  sent_at         TIMESTAMPTZ DEFAULT now(),
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  failed_reason   TEXT
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_contact ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_campaign ON whatsapp_messages(campaign_id);

-- 7. Create Workflow/Journeys Tables
CREATE TABLE IF NOT EXISTS crm_workflows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  trigger_type    VARCHAR(50) NOT NULL CHECK (trigger_type IN ('registration_complete', 'days_before_event', 'hours_before_event', 'checkin_complete', 'certificate_ready', 'feedback_missing', 'event_completed')),
  trigger_config  JSONB,
  actions         JSONB NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_workflow_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workflow_id     UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  execution_log   JSONB,
  scheduled_at    TIMESTAMPTZ,
  executed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_runs_scheduled ON crm_workflow_runs(scheduled_at, status);

-- Enable RLS on all tables
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_runs ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies (Tenant Isolation)
CREATE POLICY crm_contacts_all ON crm_contacts
  USING (tenant_id = get_current_client_id())
  WITH CHECK (tenant_id = get_current_client_id());

CREATE POLICY event_feedback_all ON event_feedback
  USING (client_id = get_current_client_id())
  WITH CHECK (client_id = get_current_client_id());

CREATE POLICY whatsapp_templates_all ON whatsapp_templates
  USING (client_id = get_current_client_id())
  WITH CHECK (client_id = get_current_client_id());

CREATE POLICY whatsapp_campaigns_all ON whatsapp_campaigns
  USING (client_id = get_current_client_id())
  WITH CHECK (client_id = get_current_client_id());

CREATE POLICY whatsapp_messages_all ON whatsapp_messages
  USING (client_id = get_current_client_id())
  WITH CHECK (client_id = get_current_client_id());

CREATE POLICY crm_workflows_all ON crm_workflows
  USING (client_id = get_current_client_id())
  WITH CHECK (client_id = get_current_client_id());

CREATE POLICY crm_workflow_runs_all ON crm_workflow_runs
  USING (client_id = get_current_client_id())
  WITH CHECK (client_id = get_current_client_id());

-- ================================================================
-- DATABASE TRIGGERS FOR CRM SYNC
-- ================================================================

-- Helper score calculator function
CREATE OR REPLACE FUNCTION calculate_contact_engagement_score(p_contact_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_score INT := 0;
  v_registrations_count INT := 0;
  v_attendance_count INT := 0;
  v_feedback_count INT := 0;
  v_volunteer_count INT := 0;
  v_speaker_count INT := 0;
  v_contact_email VARCHAR(255);
  v_contact_phone VARCHAR(50);
  v_tenant_id UUID;
BEGIN
  -- Get contact details
  SELECT email, phone, tenant_id INTO v_contact_email, v_contact_phone, v_tenant_id
  FROM crm_contacts WHERE id = p_contact_id;

  -- 1. Registrations points (10 per registration)
  SELECT COUNT(*) INTO v_registrations_count 
  FROM registrations 
  WHERE contact_id = p_contact_id OR (client_id = v_tenant_id AND email = v_contact_email);
  
  v_score := v_score + (v_registrations_count * 10);

  -- 2. Attendance points (20 per checked_in check_in)
  SELECT COUNT(*) INTO v_attendance_count
  FROM check_ins c
  JOIN registrations r ON c.registration_id = r.id
  WHERE (r.contact_id = p_contact_id OR (r.client_id = v_tenant_id AND r.email = v_contact_email))
    AND c.scan_type = 'check_in';
    
  v_score := v_score + (v_attendance_count * 20);

  -- 3. Feedback points (10 per feedback)
  SELECT COUNT(*) INTO v_feedback_count
  FROM event_feedback f
  JOIN registrations r ON f.registration_id = r.id
  WHERE r.contact_id = p_contact_id OR (r.client_id = v_tenant_id AND r.email = v_contact_email);
  
  v_score := v_score + (v_feedback_count * 10);

  -- 4. Volunteer Activity points (25 per completed volunteer assignment)
  SELECT COUNT(*) INTO v_volunteer_count
  FROM volunteer_assignments va
  JOIN volunteer_applications vapp ON va.volunteer_application_id = vapp.id
  WHERE (vapp.contact_id = p_contact_id OR (vapp.client_id = v_tenant_id AND vapp.email = v_contact_email))
    AND va.status = 'checked_out';
    
  v_score := v_score + (v_volunteer_count * 25);

  -- 5. Speaker points (50 per session speaking)
  SELECT COUNT(*) INTO v_speaker_count
  FROM session_speakers ss
  WHERE ss.contact_id = p_contact_id OR (ss.email = v_contact_email);
  
  v_score := v_score + (v_speaker_count * 50);

  RETURN v_score;
END;
$$;

-- Trigger logic for Registrations
CREATE OR REPLACE FUNCTION sync_registration_to_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  IF NEW.contact_id IS NULL THEN
    -- Try matching email
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
      SELECT id INTO v_contact_id FROM crm_contacts 
      WHERE tenant_id = NEW.client_id AND email = NEW.email AND deleted_at IS NULL LIMIT 1;
    END IF;
    
    -- Try matching phone
    IF v_contact_id IS NULL AND NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
      SELECT id INTO v_contact_id FROM crm_contacts 
      WHERE tenant_id = NEW.client_id AND phone = NEW.phone AND deleted_at IS NULL LIMIT 1;
    END IF;
    
    -- Insert new contact if not found
    IF v_contact_id IS NULL THEN
      INSERT INTO crm_contacts (
        tenant_id, name, phone, email, organization, designation, source, status
      ) VALUES (
        NEW.client_id,
        COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Unknown Attendee'),
        NEW.phone,
        NEW.email,
        NEW.company,
        NEW.job_title,
        COALESCE(NEW.source, 'registration'),
        'active'
      ) RETURNING id INTO v_contact_id;
    ELSE
      -- Update empty contact fields
      UPDATE crm_contacts SET
        name = COALESCE(name, NEW.first_name || ' ' || NEW.last_name),
        phone = COALESCE(phone, NEW.phone),
        organization = COALESCE(organization, NEW.company),
        designation = COALESCE(designation, NEW.job_title),
        updated_at = now()
      WHERE id = v_contact_id;
    END IF;
    
    NEW.contact_id := v_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_registration ON registrations;
CREATE TRIGGER trigger_sync_registration
  BEFORE INSERT ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION sync_registration_to_contact();

-- Trigger logic for Volunteer Applications
CREATE OR REPLACE FUNCTION sync_volunteer_to_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  IF NEW.contact_id IS NULL THEN
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
      SELECT id INTO v_contact_id FROM crm_contacts 
      WHERE tenant_id = NEW.client_id AND email = NEW.email AND deleted_at IS NULL LIMIT 1;
    END IF;
    
    IF v_contact_id IS NULL AND NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
      SELECT id INTO v_contact_id FROM crm_contacts 
      WHERE tenant_id = NEW.client_id AND phone = NEW.phone AND deleted_at IS NULL LIMIT 1;
    END IF;
    
    IF v_contact_id IS NULL THEN
      INSERT INTO crm_contacts (
        tenant_id, name, phone, email, source, status
      ) VALUES (
        NEW.client_id,
        COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Unknown Volunteer'),
        NEW.phone,
        NEW.email,
        'volunteer_application',
        'active'
      ) RETURNING id INTO v_contact_id;
    ELSE
      UPDATE crm_contacts SET
        name = COALESCE(name, NEW.first_name || ' ' || NEW.last_name),
        phone = COALESCE(phone, NEW.phone),
        updated_at = now()
      WHERE id = v_contact_id;
    END IF;
    
    NEW.contact_id := v_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_volunteer ON volunteer_applications;
CREATE TRIGGER trigger_sync_volunteer
  BEFORE INSERT ON volunteer_applications
  FOR EACH ROW
  EXECUTE FUNCTION sync_volunteer_to_contact();

-- Trigger logic for Session Speakers
CREATE OR REPLACE FUNCTION sync_speaker_to_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contact_id UUID;
  v_client_id UUID;
BEGIN
  SELECT client_id INTO v_client_id FROM sessions WHERE id = NEW.session_id;

  IF NEW.contact_id IS NULL AND v_client_id IS NOT NULL THEN
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
      SELECT id INTO v_contact_id FROM crm_contacts 
      WHERE tenant_id = v_client_id AND email = NEW.email AND deleted_at IS NULL LIMIT 1;
    END IF;
    
    IF v_contact_id IS NULL THEN
      INSERT INTO crm_contacts (
        tenant_id, name, email, organization, source, status
      ) VALUES (
        v_client_id,
        NEW.name,
        NEW.email,
        NEW.organization,
        'speaker_assignment',
        'active'
      ) RETURNING id INTO v_contact_id;
    ELSE
      UPDATE crm_contacts SET
        name = COALESCE(name, NEW.name),
        organization = COALESCE(organization, NEW.organization),
        updated_at = now()
      WHERE id = v_contact_id;
    END IF;
    
    NEW.contact_id := v_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_speaker ON session_speakers;
CREATE TRIGGER trigger_sync_speaker
  BEFORE INSERT ON session_speakers
  FOR EACH ROW
  EXECUTE FUNCTION sync_speaker_to_contact();

-- Trigger logic for Sponsors
CREATE OR REPLACE FUNCTION sync_sponsor_to_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  IF NEW.contact_id IS NULL AND NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
    SELECT id INTO v_contact_id FROM crm_contacts 
    WHERE tenant_id = NEW.client_id AND email = NEW.contact_email AND deleted_at IS NULL LIMIT 1;
    
    IF v_contact_id IS NULL THEN
      INSERT INTO crm_contacts (
        tenant_id, name, email, organization, source, status
      ) VALUES (
        NEW.client_id,
        COALESCE(NEW.contact_name, NEW.name),
        NEW.contact_email,
        NEW.name,
        'sponsor_contact',
        'active'
      ) RETURNING id INTO v_contact_id;
    ELSE
      UPDATE crm_contacts SET
        name = COALESCE(name, NEW.contact_name),
        organization = COALESCE(organization, NEW.name),
        updated_at = now()
      WHERE id = v_contact_id;
    END IF;
    
    NEW.contact_id := v_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_sponsor ON sponsors;
CREATE TRIGGER trigger_sync_sponsor
  BEFORE INSERT ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION sync_sponsor_to_contact();

-- Trigger to recalculate and sync engagement scores on registrations, attendance, feedback updates
CREATE OR REPLACE FUNCTION trigger_update_engagement_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'registrations' THEN
    v_contact_id := COALESCE(NEW.contact_id, OLD.contact_id);
  ELSIF TG_TABLE_NAME = 'check_ins' THEN
    SELECT contact_id INTO v_contact_id FROM registrations WHERE id = NEW.registration_id;
  ELSIF TG_TABLE_NAME = 'event_feedback' THEN
    SELECT contact_id INTO v_contact_id FROM registrations WHERE id = NEW.registration_id;
  ELSIF TG_TABLE_NAME = 'volunteer_assignments' THEN
    SELECT contact_id INTO v_contact_id FROM volunteer_applications WHERE id = NEW.volunteer_application_id;
  ELSIF TG_TABLE_NAME = 'session_speakers' THEN
    v_contact_id := COALESCE(NEW.contact_id, OLD.contact_id);
  END IF;

  IF v_contact_id IS NOT NULL THEN
    UPDATE crm_contacts 
    SET engagement_score = calculate_contact_engagement_score(v_contact_id)
    WHERE id = v_contact_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_score_reg ON registrations;
CREATE TRIGGER trigger_score_reg
  AFTER INSERT OR UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

DROP TRIGGER IF EXISTS trigger_score_checkin ON check_ins;
CREATE TRIGGER trigger_score_checkin
  AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

DROP TRIGGER IF EXISTS trigger_score_feedback ON event_feedback;
CREATE TRIGGER trigger_score_feedback
  AFTER INSERT ON event_feedback
  FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

DROP TRIGGER IF EXISTS trigger_score_volunteer ON volunteer_assignments;
CREATE TRIGGER trigger_score_volunteer
  AFTER UPDATE OF status ON volunteer_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

DROP TRIGGER IF EXISTS trigger_score_speaker ON session_speakers;
CREATE TRIGGER trigger_score_speaker
  AFTER INSERT OR UPDATE ON session_speakers
  FOR EACH ROW EXECUTE FUNCTION trigger_update_engagement_score();

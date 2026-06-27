-- ============================================================
-- MIGRATION 026: Multi-Tenant WhatsApp Business Integration
-- ============================================================
-- Each org owns its own WhatsApp Business credentials.
-- HeyPass is the integration layer only.
-- ============================================================

-- 1. WhatsApp Business configurations (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'meta' NOT NULL,
  
  -- Business info
  business_name VARCHAR(255),
  business_phone VARCHAR(20),
  business_account_id VARCHAR(100),
  
  -- Meta credentials (encrypted at app level)
  phone_number_id VARCHAR(100),
  meta_app_id VARCHAR(100),
  meta_app_secret_encrypted TEXT,
  access_token_encrypted TEXT,
  
  -- Webhook
  webhook_verify_token VARCHAR(255),
  webhook_secret_encrypted TEXT,
  webhook_url VARCHAR(500),
  
  -- Settings
  default_sender_name VARCHAR(100),
  default_country_code VARCHAR(5) DEFAULT '+91',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  template_language VARCHAR(10) DEFAULT 'en',
  
  -- Status
  connection_status VARCHAR(20) DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INT DEFAULT 0,
  
  -- Limits (from Meta)
  messaging_limit_tier VARCHAR(20) DEFAULT 'restricted',
  daily_limit INT DEFAULT 250,
  messages_sent_today INT DEFAULT 0,
  messages_sent_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(client_id)
);

-- RLS
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_configs_client_select" ON whatsapp_configs
  FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "wa_configs_client_insert" ON whatsapp_configs
  FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "wa_configs_client_update" ON whatsapp_configs
  FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "wa_configs_superadmin_select" ON whatsapp_configs
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND is_superadmin = true));

CREATE INDEX IF NOT EXISTS idx_wa_configs_client ON whatsapp_configs(client_id);

-- 2. WhatsApp templates (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  config_id UUID,
  
  meta_template_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('approved', 'pending', 'rejected', 'disabled')),
  
  -- Template structure
  header_type VARCHAR(20),
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  
  -- Variables
  variables JSONB DEFAULT '[]',
  
  -- Metadata
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_templates_client_select" ON whatsapp_templates
  FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "wa_templates_client_insert" ON whatsapp_templates
  FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "wa_templates_client_update" ON whatsapp_templates
  FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "wa_templates_client_delete" ON whatsapp_templates
  FOR DELETE USING (client_id = get_current_client_id());

CREATE INDEX IF NOT EXISTS idx_wa_templates_client ON whatsapp_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_wa_templates_config ON whatsapp_templates(config_id);

-- 3. WhatsApp contacts (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blocked')),
  lead_status VARCHAR(20) DEFAULT 'new'
    CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  
  -- Tags & segments
  tags JSONB DEFAULT '[]',
  segments JSONB DEFAULT '[]',
  
  -- Custom fields
  custom_fields JSONB DEFAULT '{}',
  
  -- Stats
  messages_sent INT DEFAULT 0,
  messages_delivered INT DEFAULT 0,
  messages_read INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  
  -- Source
  source VARCHAR(50) DEFAULT 'manual',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(client_id, phone)
);

ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_contacts_client_select" ON whatsapp_contacts
  FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "wa_contacts_client_insert" ON whatsapp_contacts
  FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "wa_contacts_client_update" ON whatsapp_contacts
  FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "wa_contacts_client_delete" ON whatsapp_contacts
  FOR DELETE USING (client_id = get_current_client_id());

CREATE INDEX IF NOT EXISTS idx_wa_contacts_client ON whatsapp_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone ON whatsapp_contacts(client_id, phone);

-- 4. WhatsApp messages (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_messages_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
  config_id UUID REFERENCES whatsapp_configs(id) ON DELETE SET NULL,
  
  -- Message info
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR(20) DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'document', 'template', 'interactive', 'location')),
  
  -- Content
  message_text TEXT,
  media_url VARCHAR(500),
  template_name VARCHAR(100),
  template_variables JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'sent'
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  failed_reason TEXT,
  
  -- Meta IDs
  meta_message_id VARCHAR(100),
  conversation_id VARCHAR(100),
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_messages_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_messages_client_select" ON whatsapp_messages_v2
  FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "wa_messages_client_insert" ON whatsapp_messages_v2
  FOR INSERT WITH CHECK (client_id = get_current_client_id());

CREATE INDEX IF NOT EXISTS idx_wa_messages_client ON whatsapp_messages_v2(client_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_contact ON whatsapp_messages_v2(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status ON whatsapp_messages_v2(client_id, status);

-- 5. WhatsApp broadcasts (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  
  -- Targeting
  target_type VARCHAR(20) DEFAULT 'all'
    CHECK (target_type IN ('all', 'tags', 'segments', 'manual')),
  target_filter JSONB DEFAULT '{}',
  contact_ids JSONB DEFAULT '[]',
  
  -- Content override
  message_text TEXT,
  template_variables JSONB,
  
  -- Schedule
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Stats
  total_contacts INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  
  -- Created by
  created_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_broadcasts_client_select" ON whatsapp_broadcasts
  FOR SELECT USING (client_id = get_current_client_id());
CREATE POLICY "wa_broadcasts_client_insert" ON whatsapp_broadcasts
  FOR INSERT WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "wa_broadcasts_client_update" ON whatsapp_broadcasts
  FOR UPDATE USING (client_id = get_current_client_id());
CREATE POLICY "wa_broadcasts_client_delete" ON whatsapp_broadcasts
  FOR DELETE USING (client_id = get_current_client_id());

CREATE INDEX IF NOT EXISTS idx_wa_broadcasts_client ON whatsapp_broadcasts(client_id);

-- 6. WhatsApp broadcast deliveries (per-recipient tracking)
CREATE TABLE IF NOT EXISTS whatsapp_broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  broadcast_id UUID NOT NULL REFERENCES whatsapp_broadcasts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  status VARCHAR(20) DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  meta_message_id VARCHAR(100),
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_broadcast_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_deliveries_client_select" ON whatsapp_broadcast_deliveries
  FOR SELECT USING (client_id = get_current_client_id());

CREATE INDEX IF NOT EXISTS idx_wa_deliveries_broadcast ON whatsapp_broadcast_deliveries(broadcast_id);

-- 7. WhatsApp webhook logs (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_webhook_logs_client_select" ON whatsapp_webhook_logs
  FOR SELECT USING (client_id = get_current_client_id());

CREATE INDEX IF NOT EXISTS idx_wa_webhook_client ON whatsapp_webhook_logs(client_id);

-- 8. Add WhatsApp permissions
DO $$BEGIN
  -- Only insert if not already present
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'whatsapp.view') THEN
    INSERT INTO permissions (name, resource, action, description) VALUES
      ('whatsapp.view', 'whatsapp', 'view', 'View WhatsApp configuration and messages'),
      ('whatsapp.manage', 'whatsapp', 'manage', 'Manage WhatsApp credentials and settings'),
      ('whatsapp.send', 'whatsapp', 'send', 'Send WhatsApp messages'),
      ('whatsapp.broadcast', 'whatsapp', 'broadcast', 'Create and manage broadcasts'),
      ('whatsapp.contacts', 'whatsapp', 'contacts', 'Manage WhatsApp contacts'),
      ('whatsapp.templates', 'whatsapp', 'templates', 'Manage WhatsApp templates');
  END IF;
END$$;

-- 9. Add WhatsApp stats columns to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_messages_used INT DEFAULT 0;

-- 10. Add updated_at trigger for whatsapp_configs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wa_configs_updated_at') THEN
    CREATE TRIGGER update_wa_configs_updated_at
      BEFORE UPDATE ON whatsapp_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wa_templates_updated_at') THEN
    CREATE TRIGGER update_wa_templates_updated_at
      BEFORE UPDATE ON whatsapp_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wa_broadcasts_updated_at') THEN
    CREATE TRIGGER update_wa_broadcasts_updated_at
      BEFORE UPDATE ON whatsapp_broadcasts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'Migration 026 completed: Multi-Tenant WhatsApp Business Integration' AS result;

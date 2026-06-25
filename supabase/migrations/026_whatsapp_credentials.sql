-- Migration 026: WhatsApp Credentials + Inbox Improvements
-- Adds per-tenant WhatsApp credential storage and inbox management fields

-- 1. WhatsApp Credentials Table (per-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  api_token TEXT,
  phone_number_id TEXT,
  waba_id TEXT,
  webhook_verify_token TEXT DEFAULT uuid_generate_v7()::text,
  is_connected BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

ALTER TABLE whatsapp_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select" ON whatsapp_credentials
  FOR SELECT USING (client_id IN (SELECT get_user_clients_ids()));

CREATE POLICY "tenant_isolation_insert" ON whatsapp_credentials
  FOR INSERT WITH CHECK (client_id IN (SELECT get_user_clients_ids()));

CREATE POLICY "tenant_isolation_update" ON whatsapp_credentials
  FOR UPDATE USING (client_id IN (SELECT get_user_clients_ids()));

-- 2. Add inbox management fields to crm_contacts
ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chat_status VARCHAR(20) DEFAULT 'active' CHECK (chat_status IN ('active', 'resolved')),
  ADD COLUMN IF NOT EXISTS internal_note TEXT;

-- 3. Index for inbox queries
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned_to ON crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_chat_status ON crm_contacts(chat_status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_credentials_client_id ON whatsapp_credentials(client_id);

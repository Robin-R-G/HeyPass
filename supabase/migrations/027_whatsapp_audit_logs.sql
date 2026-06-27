-- ============================================================
-- MIGRATION 027: WhatsApp Audit Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_audit_client_select" ON whatsapp_audit_logs
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY "wa_audit_superadmin_select" ON whatsapp_audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND is_superadmin = true));

CREATE INDEX IF NOT EXISTS idx_wa_audit_client ON whatsapp_audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_wa_audit_action ON whatsapp_audit_logs(client_id, action);
CREATE INDEX IF NOT EXISTS idx_wa_audit_created ON whatsapp_audit_logs(client_id, created_at DESC);

SELECT 'Migration 027 completed: WhatsApp Audit Logs' AS result;

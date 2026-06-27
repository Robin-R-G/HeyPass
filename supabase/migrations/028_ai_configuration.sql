-- ============================================================
-- MIGRATION 028: AI Configuration (BYOAI)
-- Bring Your Own AI - Per-organization AI provider configuration
-- ============================================================

-- ============================================================
-- AI CONFIGURATIONS TABLE
-- One configuration per organization (client_id is UNIQUE)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  provider VARCHAR(50) NOT NULL,
  api_key_encrypted TEXT,
  api_key_prefix VARCHAR(10),
  default_model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  system_prompt TEXT,
  is_enabled BOOLEAN DEFAULT false,
  
  connection_status VARCHAR(20) DEFAULT 'disconnected',
  last_connection_at TIMESTAMPTZ,
  last_error TEXT,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT uq_ai_config_client UNIQUE (client_id),
  CONSTRAINT chk_ai_provider CHECK (provider IN (
    'openai', 'groq', 'openrouter', 'together_ai',
    'xai', 'anthropic', 'google', 'deepseek', 'ollama'
  )),
  CONSTRAINT chk_ai_connection_status CHECK (connection_status IN (
    'connected', 'disconnected', 'error'
  )),
  CONSTRAINT chk_ai_temperature CHECK (temperature >= 0 AND temperature <= 2),
  CONSTRAINT chk_ai_max_tokens CHECK (max_tokens >= 1 AND max_tokens <= 128000)
);

ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_config_client_select" ON ai_configurations
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY "ai_config_client_insert" ON ai_configurations
  FOR INSERT WITH CHECK (client_id = get_current_client_id());

CREATE POLICY "ai_config_client_update" ON ai_configurations
  FOR UPDATE USING (client_id = get_current_client_id());

CREATE POLICY "ai_config_client_delete" ON ai_configurations
  FOR DELETE USING (client_id = get_current_client_id());

-- Superadmins can read (but API key is masked at application level)
CREATE POLICY "ai_config_superadmin_select" ON ai_configurations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users WHERE id = get_current_user_id() AND is_superadmin = true
  ));

CREATE INDEX IF NOT EXISTS idx_ai_config_client ON ai_configurations(client_id);

-- ============================================================
-- AI PROMPT TEMPLATES TABLE
-- Reusable prompt templates per organization
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT uq_ai_prompt_client_slug UNIQUE (client_id, slug)
);

ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompt_client_select" ON ai_prompt_templates
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY "ai_prompt_client_insert" ON ai_prompt_templates
  FOR INSERT WITH CHECK (client_id = get_current_client_id());

CREATE POLICY "ai_prompt_client_update" ON ai_prompt_templates
  FOR UPDATE USING (client_id = get_current_client_id());

CREATE POLICY "ai_prompt_client_delete" ON ai_prompt_templates
  FOR DELETE USING (client_id = get_current_client_id());

-- Superadmins can read prompt templates
CREATE POLICY "ai_prompt_superadmin_select" ON ai_prompt_templates
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users WHERE id = get_current_user_id() AND is_superadmin = true
  ));

CREATE INDEX IF NOT EXISTS idx_ai_prompt_client ON ai_prompt_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_client_slug ON ai_prompt_templates(client_id, slug);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_category ON ai_prompt_templates(client_id, category);

-- ============================================================
-- AI USAGE LOGS TABLE
-- Per-request usage tracking (partitioned by month)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  feature VARCHAR(50),
  
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next 2 months
CREATE TABLE IF NOT EXISTS ai_usage_logs_2026_07 PARTITION OF ai_usage_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS ai_usage_logs_2026_08 PARTITION OF ai_usage_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS ai_usage_logs_2026_09 PARTITION OF ai_usage_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_client_select" ON ai_usage_logs
  FOR SELECT USING (client_id = get_current_client_id());

CREATE POLICY "ai_usage_client_insert" ON ai_usage_logs
  FOR INSERT WITH CHECK (client_id = get_current_client_id());

-- Superadmins can read usage logs
CREATE POLICY "ai_usage_superadmin_select" ON ai_usage_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users WHERE id = get_current_user_id() AND is_superadmin = true
  ));

CREATE INDEX IF NOT EXISTS idx_ai_usage_client ON ai_usage_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_logs(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_logs(client_id, feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status ON ai_usage_logs(client_id, status, created_at DESC);

-- ============================================================
-- SEED DEFAULT PROMPT TEMPLATES
-- These are system defaults; organizations can customize
-- ============================================================

-- We insert with a placeholder client_id; the trigger below
-- will copy defaults to each new client on creation.

-- ============================================================
-- FUNCTION: Seed default AI prompt templates for a client
-- ============================================================
CREATE OR REPLACE FUNCTION seed_ai_prompt_templates(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_prompt_templates (client_id, name, slug, category, description, template, variables, is_default, is_active) VALUES
  (p_client_id, 'Event Description', 'event_description', 'event',
   'Generate a compelling event description',
   'Write a professional and engaging description for the following event:

Event Title: {{title}}
Event Type: {{event_type}}
Date: {{date}}
Venue: {{venue}}
Target Audience: {{audience}}
Key Highlights: {{highlights}}

Requirements:
- Professional tone
- 150-300 words
- Include a compelling hook
- Mention key details
- End with a call to action',
   '["title", "event_type", "date", "venue", "audience", "highlights"]'::jsonb,
   true, true),

  (p_client_id, 'Workshop Description', 'workshop_description', 'event',
   'Generate a workshop description',
   'Write a detailed workshop description:

Workshop Title: {{title}}
Topic: {{topic}}
Duration: {{duration}}
Level: {{level}}
Instructor: {{instructor}}

Requirements:
- Clear learning objectives
- Target skill level
- 100-200 words',
   '["title", "topic", "duration", "level", "instructor"]'::jsonb,
   true, true),

  (p_client_id, 'Agenda Generator', 'agenda', 'event',
   'Generate an event agenda/schedule',
   'Create a structured agenda for the following event:

Event: {{title}}
Duration: {{duration}}
Sessions: {{sessions}}
Breaks: {{breaks}}

Format as a clean timeline with time slots, session names, and brief descriptions.',
   '["title", "duration", "sessions", "breaks"]'::jsonb,
   true, true),

  (p_client_id, 'Speaker Biography', 'speaker_bio', 'event',
   'Generate a professional speaker biography',
   'Write a professional biography for the following speaker:

Name: {{name}}
Title: {{title}}
Company: {{company}}
Expertise: {{expertise}}
Achievements: {{achievements}}

Requirements:
- Third person
- 100-150 words
- Professional and engaging
- Highlight relevant expertise',
   '["name", "title", "company", "expertise", "achievements"]'::jsonb,
   true, true),

  (p_client_id, 'FAQ Generator', 'faq', 'event',
   'Generate frequently asked questions for an event',
   'Generate 8-10 relevant FAQs for the following event:

Event: {{title}}
Type: {{event_type}}
Date: {{date}}
Location: {{location}}
Registration: {{registration_info}}

Include questions about:
- Registration process
- What to bring
- Schedule
- Parking/transport
- Refund policy
- Contact information',
   '["title", "event_type", "date", "location", "registration_info"]'::jsonb,
   true, true),

  (p_client_id, 'WhatsApp Reminder', 'whatsapp_message', 'communication',
   'Generate a WhatsApp reminder message',
   'Write a concise WhatsApp reminder message for:

Event: {{title}}
Date: {{date}}
Time: {{time}}
Venue: {{venue}}
Recipient: {{recipient_name}}

Requirements:
- Short and friendly
- Include key details
- Use appropriate emojis
- End with a confirmation request
- Max 200 words',
   '["title", "date", "time", "venue", "recipient_name"]'::jsonb,
   true, true),

  (p_client_id, 'Email Announcement', 'email', 'communication',
   'Generate an email announcement',
   'Write a professional email announcement for:

Event: {{title}}
Purpose: {{purpose}}
Recipient: {{recipient_name}}
Key Details: {{details}}

Requirements:
- Professional subject line
- Clear and concise body
- Call to action
- Proper email formatting',
   '["title", "purpose", "recipient_name", "details"]'::jsonb,
   true, true),

  (p_client_id, 'Certificate Appreciation', 'certificate_message', 'certificate',
   'Generate a certificate appreciation message',
   'Write a heartfelt certificate appreciation message for:

Recipient: {{recipient_name}}
Event: {{title}}
Achievement: {{achievement}}
Date: {{date}}

Requirements:
- Formal and warm tone
- Acknowledge the achievement
- 50-100 words
- Suitable for printing on certificate',
   '["recipient_name", "title", "achievement", "date"]'::jsonb,
   true, true),

  (p_client_id, 'Event Summary', 'event_summary', 'event',
   'Generate a post-event summary',
   'Write a comprehensive post-event summary:

Event: {{title}}
Date: {{date}}
Attendance: {{attendance}}
Highlights: {{highlights}}
Key Moments: {{key_moments}}

Requirements:
- Professional tone
- Highlight achievements
- Include statistics
- 200-400 words
- Suitable for stakeholders and social media',
   '["title", "date", "attendance", "highlights", "key_moments"]'::jsonb,
   true, true),

  (p_client_id, 'Dashboard Insights', 'dashboard_insights', 'general',
   'Generate insights from dashboard data',
   'Analyze the following event data and provide actionable insights:

Event: {{title}}
Registrations: {{registrations}}
Check-ins: {{check_ins}}
Revenue: {{revenue}}
Tickets Sold: {{tickets_sold}}

Provide:
- Key metrics summary
- Areas of improvement
- Recommendations
- Trend observations',
   '["title", "registrations", "check_ins", "revenue", "tickets_sold"]'::jsonb,
   true, true),

  (p_client_id, 'Marketing Content', 'marketing_content', 'marketing',
   'Generate marketing content',
   'Create marketing content for:

Event: {{title}}
Target Audience: {{target_audience}}
Tone: {{tone}}
Channel: {{channel}}
Key Message: {{key_message}}

Requirements:
- Engaging headline
- Persuasive copy
- Clear call to action
- Appropriate length for {{channel}}',
   '["title", "target_audience", "tone", "channel", "key_message"]'::jsonb,
   true, true);
END;
$$;

-- ============================================================
-- TRIGGER: Auto-seed AI prompt templates after client creation
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_seed_ai_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM seed_ai_prompt_templates(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_client_insert_ai_templates ON clients;
CREATE TRIGGER after_client_insert_ai_templates
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_ai_templates();

-- ============================================================
-- FUNCTION: Update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_ai_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_config_updated ON ai_configurations;
CREATE TRIGGER trg_ai_config_updated
  BEFORE UPDATE ON ai_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_config_updated_at();

DROP TRIGGER IF EXISTS trg_ai_prompt_updated ON ai_prompt_templates;
CREATE TRIGGER trg_ai_prompt_updated
  BEFORE UPDATE ON ai_prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_config_updated_at();

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
-- Service role needs full access for API operations
GRANT ALL ON ai_configurations TO service_role;
GRANT ALL ON ai_prompt_templates TO service_role;
GRANT ALL ON ai_usage_logs TO service_role;

-- ============================================================
-- SEED AI PERMISSIONS
-- ============================================================
INSERT INTO permissions (name, resource, action, description) VALUES
  ('ai.view',         'ai', 'view',         'View AI configuration and status'),
  ('ai.configure',    'ai', 'configure',    'Configure AI provider, API keys, and settings'),
  ('ai.use',          'ai', 'use',          'Use AI features (generate content)'),
  ('ai.manage',       'ai', 'manage',       'Delete AI configuration and manage prompts'),
  ('ai.view_usage',   'ai', 'view_usage',   'View AI usage statistics and history')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- MAP AI PERMISSIONS TO ROLES
-- ============================================================
-- Owner gets all AI permissions (already gets ALL via seed_role_permissions)
-- Admin gets all AI permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('ai.view', 'ai.configure', 'ai.use', 'ai.manage', 'ai.view_usage')
WHERE r.slug = 'admin'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Manager gets view and use
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('ai.view', 'ai.use')
WHERE r.slug = 'manager'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Volunteer gets view and use
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('ai.view', 'ai.use')
WHERE r.slug = 'volunteer'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Scanner gets no AI permissions

SELECT 'Migration 028 completed: AI Configuration (BYOAI)' AS result;

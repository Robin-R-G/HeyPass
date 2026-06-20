-- Registration Builder Schema
-- Adds form sections, templates, analytics, multi-step, and enhanced fields

-- ============================================================
-- FORM SECTIONS (Field grouping)
-- ============================================================
CREATE TABLE form_sections (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id                 UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  title                   VARCHAR(255) NOT NULL DEFAULT 'Untitled Section',
  description             TEXT,
  sort_order              INT DEFAULT 0,
  is_collapsible          BOOLEAN DEFAULT FALSE,
  is_collapsed_default    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_sections_form ON form_sections(form_id);

-- ============================================================
-- FORM TEMPLATES (Pre-built form configurations)
-- ============================================================
CREATE TABLE form_templates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id               UUID REFERENCES clients(id) ON DELETE CASCADE,
  name                    VARCHAR(255) NOT NULL,
  description             TEXT,
  category                VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (category IN ('conference', 'workshop', 'meetup', 'webinar', 'custom')),
  fields_config           JSONB NOT NULL DEFAULT '[]',
  sections_config         JSONB NOT NULL DEFAULT '[]',
  is_system               BOOLEAN DEFAULT FALSE,
  is_public               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_form_templates_category ON form_templates(category, is_public) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_templates_client ON form_templates(client_id) WHERE deleted_at IS NULL;

-- ============================================================
-- FORM ANALYTICS (Conversion tracking)
-- ============================================================
CREATE TABLE form_analytics (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  form_id                 UUID NOT NULL REFERENCES registration_forms(id) ON DELETE CASCADE,
  event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date                    DATE NOT NULL DEFAULT CURRENT_DATE,
  views                   INT DEFAULT 0,
  starts                  INT DEFAULT 0,
  field_views             JSONB DEFAULT '{}',
  completions             INT DEFAULT 0,
  errors                  INT DEFAULT 0,
  avg_time_seconds        INT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(form_id, date)
);

CREATE INDEX idx_form_analytics_form ON form_analytics(form_id);
CREATE INDEX idx_form_analytics_date ON form_analytics(date);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Add section_id to form_fields
ALTER TABLE form_fields ADD COLUMN section_id UUID REFERENCES form_sections(id) ON DELETE SET NULL;
CREATE INDEX idx_fields_section ON form_fields(section_id);

-- Add default_value and help_text to form_fields
ALTER TABLE form_fields ADD COLUMN default_value TEXT;
ALTER TABLE form_fields ADD COLUMN help_text VARCHAR(500);
ALTER TABLE form_fields ADD COLUMN is_readonly BOOLEAN DEFAULT FALSE;
ALTER TABLE form_fields ADD COLUMN conditional_required JSONB;

-- Update field_type CHECK to include new types
ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;
ALTER TABLE form_fields ADD CONSTRAINT form_fields_field_type_check
  CHECK (field_type IN (
    'text', 'email', 'phone', 'number', 'textarea',
    'select', 'checkbox', 'radio', 'date', 'file',
    'country', 'state', 'heading', 'paragraph', 'divider'
  ));

-- Add multi-step support to registration_forms
ALTER TABLE registration_forms ADD COLUMN is_multi_step BOOLEAN DEFAULT FALSE;
ALTER TABLE registration_forms ADD COLUMN steps_config JSONB DEFAULT '[]';

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;

-- Form sections: follow form access
CREATE POLICY "form_sections_select" ON form_sections
  FOR SELECT USING (
    form_id IN (
      SELECT rf.id FROM registration_forms rf
      WHERE rf.client_id = get_client_id()
    )
  );

CREATE POLICY "form_sections_insert" ON form_sections
  FOR INSERT WITH CHECK (
    form_id IN (
      SELECT rf.id FROM registration_forms rf
      WHERE rf.client_id = get_client_id()
      AND get_user_role() IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "form_sections_update" ON form_sections
  FOR UPDATE USING (
    form_id IN (
      SELECT rf.id FROM registration_forms rf
      WHERE rf.client_id = get_client_id()
      AND get_user_role() IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "form_sections_delete" ON form_sections
  FOR DELETE USING (
    form_id IN (
      SELECT rf.id FROM registration_forms rf
      WHERE rf.client_id = get_client_id()
      AND get_user_role() IN ('owner', 'admin', 'manager')
    )
  );

-- Form templates: client members can read, admins can manage
CREATE POLICY "form_templates_select" ON form_templates
  FOR SELECT USING (
    is_public = TRUE
    OR client_id = get_client_id()
    OR client_id IS NULL
  );

CREATE POLICY "form_templates_insert" ON form_templates
  FOR INSERT WITH CHECK (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "form_templates_update" ON form_templates
  FOR UPDATE USING (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "form_templates_delete" ON form_templates
  FOR DELETE USING (
    client_id = get_client_id()
    AND get_user_role() IN ('owner', 'admin')
    AND is_system = FALSE
  );

-- Form analytics: client members can read, system can write
CREATE POLICY "form_analytics_select" ON form_analytics
  FOR SELECT USING (
    client_id = get_client_id()
  );

CREATE POLICY "form_analytics_insert" ON form_analytics
  FOR INSERT WITH CHECK (
    client_id = get_client_id()
  );

CREATE POLICY "form_analytics_update" ON form_analytics
  FOR UPDATE USING (
    client_id = get_client_id()
  );

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_form_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_form_sections_updated_at
  BEFORE UPDATE ON form_sections
  FOR EACH ROW EXECUTE FUNCTION update_form_sections_updated_at();

CREATE TRIGGER trigger_update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION update_form_sections_updated_at();

CREATE TRIGGER trigger_update_form_analytics_updated_at
  BEFORE UPDATE ON form_analytics
  FOR EACH ROW EXECUTE FUNCTION update_form_sections_updated_at();

-- ============================================================
-- SEED SYSTEM TEMPLATES
-- ============================================================
INSERT INTO form_templates (name, description, category, fields_config, sections_config, is_system, is_public) VALUES
(
  'Basic Conference',
  'Standard conference registration with common fields',
  'conference',
  '[
    {"label": "First Name", "field_type": "text", "is_required": true, "placeholder": "John", "sort_order": 0},
    {"label": "Last Name", "field_type": "text", "is_required": true, "placeholder": "Doe", "sort_order": 1},
    {"label": "Email", "field_type": "email", "is_required": true, "placeholder": "john@example.com", "sort_order": 2},
    {"label": "Phone", "field_type": "phone", "is_required": false, "placeholder": "+1 234 567 890", "sort_order": 3},
    {"label": "Company", "field_type": "text", "is_required": false, "placeholder": "Company Name", "sort_order": 4},
    {"label": "Job Title", "field_type": "text", "is_required": false, "placeholder": "Software Engineer", "sort_order": 5},
    {"label": "T-Shirt Size", "field_type": "select", "is_required": true, "options": {"items": [{"label": "XS", "value": "xs"}, {"label": "S", "value": "s"}, {"label": "M", "value": "m"}, {"label": "L", "value": "l"}, {"label": "XL", "value": "xl"}]}, "sort_order": 6},
    {"label": "Dietary Restrictions", "field_type": "checkbox", "is_required": false, "options": {"items": [{"label": "Vegetarian", "value": "vegetarian"}, {"label": "Vegan", "value": "vegan"}, {"label": "Gluten-Free", "value": "gluten-free"}, {"label": "Halal", "value": "halal"}, {"label": "Kosher", "value": "kosher"}]}, "sort_order": 7}
  ]',
  '[
    {"title": "Personal Information", "description": "Tell us about yourself", "sort_order": 0},
    {"title": "Preferences", "description": "Help us prepare for you", "sort_order": 1}
  ]',
  TRUE,
  TRUE
),
(
  'Workshop',
  'Workshop registration with experience level and requirements',
  'workshop',
  '[
    {"label": "First Name", "field_type": "text", "is_required": true, "sort_order": 0},
    {"label": "Last Name", "field_type": "text", "is_required": true, "sort_order": 1},
    {"label": "Email", "field_type": "email", "is_required": true, "sort_order": 2},
    {"label": "Experience Level", "field_type": "select", "is_required": true, "options": {"items": [{"label": "Beginner", "value": "beginner"}, {"label": "Intermediate", "value": "intermediate"}, {"label": "Advanced", "value": "advanced"}]}, "sort_order": 3},
    {"label": "What do you want to learn?", "field_type": "textarea", "is_required": false, "sort_order": 4},
    {"label": "Bring your own laptop?", "field_type": "radio", "is_required": true, "options": {"items": [{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}]}, "sort_order": 5}
  ]',
  '[
    {"title": "Your Details", "sort_order": 0},
    {"title": "Workshop Preferences", "sort_order": 1}
  ]',
  TRUE,
  TRUE
),
(
  'Meetup',
  'Simple meetup registration',
  'meetup',
  '[
    {"label": "Name", "field_type": "text", "is_required": true, "sort_order": 0},
    {"label": "Email", "field_type": "email", "is_required": true, "sort_order": 1},
    {"label": "Interests", "field_type": "checkbox", "is_required": false, "options": {"items": [{"label": "Technology", "value": "tech"}, {"label": "Design", "value": "design"}, {"label": "Business", "value": "business"}, {"label": "Networking", "value": "networking"}]}, "sort_order": 2},
    {"label": "How did you hear about us?", "field_type": "select", "is_required": false, "options": {"items": [{"label": "Social Media", "value": "social"}, {"label": "Friend", "value": "friend"}, {"label": "Search Engine", "value": "search"}, {"label": "Other", "value": "other"}]}, "sort_order": 3}
  ]',
  '[]',
  TRUE,
  TRUE
),
(
  'Webinar',
  'Webinar registration with engagement fields',
  'webinar',
  '[
    {"label": "First Name", "field_type": "text", "is_required": true, "sort_order": 0},
    {"label": "Last Name", "field_type": "text", "is_required": true, "sort_order": 1},
    {"label": "Email", "field_type": "email", "is_required": true, "sort_order": 2},
    {"label": "Company", "field_type": "text", "is_required": false, "sort_order": 3},
    {"label": "Role", "field_type": "select", "is_required": false, "options": {"items": [{"label": "Developer", "value": "developer"}, {"label": "Designer", "value": "designer"}, {"label": "Manager", "value": "manager"}, {"label": "Student", "value": "student"}, {"label": "Other", "value": "other"}]}, "sort_order": 4},
    {"label": "Questions for the speaker?", "field_type": "textarea", "is_required": false, "sort_order": 5}
  ]',
  '[]',
  TRUE,
  TRUE
),
(
  'Blank Form',
  'Start with a clean canvas',
  'custom',
  '[]',
  '[]',
  TRUE,
  TRUE
);

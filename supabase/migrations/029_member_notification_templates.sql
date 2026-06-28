-- ============================================================
-- MIGRATION 029: Member Event Notification Templates
-- ============================================================
-- Adds notification templates for member-related events
-- ============================================================

-- 1. Add member event notification templates
DO $$
DECLARE
  client_rec RECORD;
BEGIN
  FOR client_rec IN SELECT id FROM clients WHERE deleted_at IS NULL LOOP
    -- Member Joined (pending approval)
    IF NOT EXISTS (
      SELECT 1 FROM notification_templates 
      WHERE client_id = client_rec.id 
      AND type = 'custom' 
      AND subject LIKE '%joined%'
    ) THEN
      INSERT INTO notification_templates (
        client_id, type, subject, body, variables, is_active
      ) VALUES (
        client_rec.id,
        'custom',
        'New Member Request: {{member_name}}',
        'A new member has requested to join your organization.

Member: {{member_name}}
Email: {{member_email}}
Requested Role: {{role_name}}
Requested at: {{requested_at}}

Please review this request in the Team Management section.',
        '["member_name", "member_email", "role_name", "requested_at"]'::jsonb,
        true
      );
    END IF;

    -- Member Approved
    IF NOT EXISTS (
      SELECT 1 FROM notification_templates 
      WHERE client_id = client_rec.id 
      AND type = 'custom' 
      AND subject LIKE '%approved%'
    ) THEN
      INSERT INTO notification_templates (
        client_id, type, subject, body, variables, is_active
      ) VALUES (
        client_rec.id,
        'custom',
        'Welcome to {{organization_name}}!',
        'Your membership request has been approved!

Organization: {{organization_name}}
Role: {{role_name}}
Approved by: {{approved_by}}

You can now access the organization dashboard.',
        '["organization_name", "role_name", "approved_by"]'::jsonb,
        true
      );
    END IF;

    -- Member Rejected
    IF NOT EXISTS (
      SELECT 1 FROM notification_templates 
      WHERE client_id = client_rec.id 
      AND type = 'custom' 
      AND subject LIKE '%rejected%'
    ) THEN
      INSERT INTO notification_templates (
        client_id, type, subject, body, variables, is_active
      ) VALUES (
        client_rec.id,
        'custom',
        'Membership Request Update',
        'Your membership request for {{organization_name}} was not approved.

Organization: {{organization_name}}
Reason: {{reason}}

If you believe this was an error, please contact the organization administrator.',
        '["organization_name", "reason"]'::jsonb,
        true
      );
    END IF;

    -- Role Changed
    IF NOT EXISTS (
      SELECT 1 FROM notification_templates 
      WHERE client_id = client_rec.id 
      AND type = 'custom' 
      AND subject LIKE '%role changed%'
    ) THEN
      INSERT INTO notification_templates (
        client_id, type, subject, body, variables, is_active
      ) VALUES (
        client_rec.id,
        'custom',
        'Your role has been updated',
        'Your role in {{organization_name}} has been changed.

Previous Role: {{old_role}}
New Role: {{new_role}}
Changed by: {{changed_by}}

Your permissions may have changed. Please review the updated access levels.',
        '["organization_name", "old_role", "new_role", "changed_by"]'::jsonb,
        true
      );
    END IF;

    -- Member Suspended
    IF NOT EXISTS (
      SELECT 1 FROM notification_templates 
      WHERE client_id = client_rec.id 
      AND type = 'custom' 
      AND subject LIKE '%suspended%'
    ) THEN
      INSERT INTO notification_templates (
        client_id, type, subject, body, variables, is_active
      ) VALUES (
        client_rec.id,
        'custom',
        'Account Suspended',
        'Your account in {{organization_name}} has been suspended.

Organization: {{organization_name}}
Reason: {{reason}}
Suspended by: {{suspended_by}}

Please contact the organization administrator for more information.',
        '["organization_name", "reason", "suspended_by"]'::jsonb,
        true
      );
    END IF;

    -- Invitation Code Changed
    IF NOT EXISTS (
      SELECT 1 FROM notification_templates 
      WHERE client_id = client_rec.id 
      AND type = 'custom' 
      AND subject LIKE '%invitation code%'
    ) THEN
      INSERT INTO notification_templates (
        client_id, type, subject, body, variables, is_active
      ) VALUES (
        client_rec.id,
        'custom',
        'Organization Invitation Code Updated',
        'The invitation code for {{organization_name}} has been changed.

Old Code: {{old_code}}
New Code: {{new_code}}
Changed by: {{changed_by}}

Please update any shared invitation links accordingly.',
        '["organization_name", "old_code", "new_code", "changed_by"]'::jsonb,
        true
      );
    END IF;
  END LOOP;
END$$;

-- Done
SELECT 'Migration 029 completed: Member event notification templates added' AS result;

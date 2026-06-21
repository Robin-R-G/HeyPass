-- Notification Schema

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================
CREATE TABLE notification_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL CHECK (type IN ('registration', 'payment', 'certificate', 'reminder', 'marketing', 'checkin', 'custom')),
  name          VARCHAR(255) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  body          TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  variables     JSONB,  -- available {{placeholders}}
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_notif_templates_client ON notification_templates(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notif_templates_event ON notification_templates(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notif_templates_type ON notification_templates(client_id, type) WHERE deleted_at IS NULL;

-- ============================================================
-- NOTIFICATIONS (log of all sent notifications)
-- ============================================================
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  recipient_email   VARCHAR(255) NOT NULL,
  recipient_name    VARCHAR(255),
  type              VARCHAR(50) NOT NULL,
  subject           VARCHAR(500) NOT NULL,
  body              TEXT,
  status            VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'failed')),
  template_id       UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  metadata          JSONB,
  error_message     TEXT,
  sendgrid_message_id VARCHAR(100),
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_client ON notifications(client_id, created_at DESC);
CREATE INDEX idx_notifications_event ON notifications(event_id, created_at DESC);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_email, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(client_id, type, created_at DESC);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email_enabled     BOOLEAN DEFAULT TRUE,
  marketing_enabled BOOLEAN DEFAULT TRUE,
  reminder_enabled  BOOLEAN DEFAULT TRUE,
  certificate_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, client_id)
);

-- ============================================================
-- NOTIFICATION QUEUE (for BullMQ)
-- ============================================================
CREATE TABLE notification_queue (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  notification_id   UUID REFERENCES notifications(id) ON DELETE CASCADE,
  priority          INT DEFAULT 0,
  scheduled_at      TIMESTAMPTZ DEFAULT now(),
  attempts          INT DEFAULT 0,
  max_attempts      INT DEFAULT 3,
  status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_error        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  processed_at      TIMESTAMPTZ
);

CREATE INDEX idx_notif_queue_pending ON notification_queue(scheduled_at, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_notif_queue_status ON notification_queue(status, created_at DESC);

-- ============================================================
-- SEED DEFAULT TEMPLATES
-- ============================================================
-- Done via function when client is created

-- Single Event Plans Schema

-- ============================================================
-- 1. Add type column to subscription_plans
-- ============================================================
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'subscription' CHECK (type IN ('subscription', 'single_event'));

-- ============================================================
-- 2. Add event pricing to plans (for single_event type)
-- ============================================================
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS price_per_event DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_registration_limit INT DEFAULT 0;

-- ============================================================
-- 3. Event-specific subscriptions (single event purchases)
-- ============================================================
CREATE TABLE event_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES subscription_plans(id),
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  purchased_at        TIMESTAMPTZ DEFAULT now(),
  expires_at          TIMESTAMPTZ,
  registration_limit  INT NOT NULL DEFAULT 0,
  registrations_used  INT NOT NULL DEFAULT 0,
  amount_paid         DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_reference   VARCHAR(100),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_subs_client ON event_subscriptions(client_id);
CREATE INDEX idx_event_subs_event ON event_subscriptions(event_id);

-- ============================================================
-- 4. Seed single-event plans
-- ============================================================
INSERT INTO subscription_plans (name, slug, type, price_per_event, event_registration_limit, commission_rate, max_events, max_registrations, max_team_members, features, display_order) VALUES
  ('Event Starter', 'event-starter', 'single_event', 199, 100, 2.5, 1, 100, 5, '["basic_certificates", "analytics"]', 10),
  ('Event Pro', 'event-pro', 'single_event', 499, 500, 2.0, 1, 500, 10, '["all_certificates", "analytics", "white_label"]', 11),
  ('Event Enterprise', 'event-enterprise', 'single_event', 999, 5000, 1.5, 1, 5000, 25, '["all_certificates", "analytics", "white_label", "custom_domain"]', 12);

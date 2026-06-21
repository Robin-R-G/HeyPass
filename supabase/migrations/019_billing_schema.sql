-- Billing Schema

-- ============================================================
-- 1. SUBSCRIPTION PLANS (System-defined)
-- ============================================================
CREATE TABLE subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name                VARCHAR(100) NOT NULL,
  slug                VARCHAR(50) UNIQUE NOT NULL,
  price_monthly       DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_annual        DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate     DECIMAL(5,2) NOT NULL DEFAULT 2.5,
  max_events          INT NOT NULL DEFAULT 3,
  max_registrations   INT NOT NULL DEFAULT 100,
  max_team_members    INT NOT NULL DEFAULT 5,
  features            JSONB DEFAULT '[]',
  is_active           BOOLEAN DEFAULT TRUE,
  display_order       INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. CLIENT SUBSCRIPTIONS
-- ============================================================
CREATE TABLE client_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle           VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  status                  VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial', 'paused')),
  current_period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end      TIMESTAMPTZ NOT NULL,
  trial_end               TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_client ON client_subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON client_subscriptions(status);

-- ============================================================
-- 3. PAYMENT GATEWAY CONFIG (Encrypted)
-- ============================================================
CREATE TABLE payment_gateway_config (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider                VARCHAR(20) NOT NULL CHECK (provider IN ('razorpay', 'cashfree')),
  api_key_encrypted       TEXT,
  api_secret_encrypted    TEXT,
  webhook_secret_encrypted TEXT,
  is_live                 BOOLEAN DEFAULT FALSE,
  is_active               BOOLEAN DEFAULT TRUE,
  verified_at             TIMESTAMPTZ,
  last_webhook_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id, provider)
);

-- ============================================================
-- 4. INVOICES
-- ============================================================
CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  invoice_number      VARCHAR(50) UNIQUE NOT NULL,
  type                VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'commission', 'refund', 'credit')),
  status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_amount   DECIMAL(10,2) DEFAULT 0,
  gst_amount          DECIMAL(10,2) DEFAULT 0,
  total               DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(3) DEFAULT 'INR',
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  due_date            DATE,
  paid_at             TIMESTAMPTZ,
  payment_method      VARCHAR(50),
  payment_reference   VARCHAR(100),
  pdf_url             VARCHAR(500),
  notes               TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_client ON invoices(client_id, created_at DESC);
CREATE INDEX idx_invoices_status ON invoices(status, due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ============================================================
-- 5. INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE invoice_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     VARCHAR(500) NOT NULL,
  quantity        INT DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================
-- 6. COMMISSION TRACKING
-- ============================================================
CREATE TABLE commissions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id              UUID REFERENCES events(id) ON DELETE SET NULL,
  invoice_id            UUID REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_id        VARCHAR(100),
  transaction_amount    DECIMAL(10,2) NOT NULL,
  commission_rate       DECIMAL(5,2) NOT NULL,
  commission_amount     DECIMAL(10,2) NOT NULL,
  gst_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_payout            DECIMAL(10,2) NOT NULL,
  status                VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'refunded')),
  transaction_at        TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_commissions_client ON commissions(client_id, created_at DESC);
CREATE INDEX idx_commissions_status ON commissions(status, transaction_at);
CREATE INDEX idx_commissions_event ON commissions(event_id);

-- ============================================================
-- 7. BILLING WEBHOOK EVENTS LOG
-- ============================================================
CREATE TABLE billing_webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gateway         VARCHAR(20) NOT NULL,
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  processed       BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  idempotency_key VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_webhooks_client ON billing_webhook_events(client_id, created_at DESC);
CREATE INDEX idx_billing_webhooks_idempotency ON billing_webhook_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- 8. FRAUD RULES
-- ============================================================
CREATE TABLE fraud_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_type       VARCHAR(50) NOT NULL CHECK (rule_type IN ('velocity', 'amount', 'duplicate', 'pattern')),
  config          JSONB NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fraud_rules_client ON fraud_rules(client_id);

-- ============================================================
-- 9. FRAUD ALERTS
-- ============================================================
CREATE TABLE fraud_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  commission_id   UUID REFERENCES commissions(id) ON DELETE SET NULL,
  rule_type       VARCHAR(50) NOT NULL,
  severity        VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description     TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'flagged')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fraud_alerts_client ON fraud_alerts(client_id, created_at DESC);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status, severity);

-- ============================================================
-- 10. SEED DEFAULT PLANS
-- ============================================================
INSERT INTO subscription_plans (name, slug, price_monthly, price_annual, commission_rate, max_events, max_registrations, max_team_members, features, display_order) VALUES
  ('Free', 'free', 0, 0, 0.5, 3, 100, 5, '["basic_events", "basic_certificates", "email_support"]', 1),
  ('Starter', 'starter', 999, 7992, 2.0, 10, 1000, 10, '["all_events", "all_certificates", "white_label", "analytics", "priority_support"]', 2),
  ('Professional', 'professional', 2999, 23992, 1.5, 50, 10000, 25, '["all_events", "all_certificates", "white_label", "analytics", "api_access", "webhooks", "custom_domains", "dedicated_support"]', 3),
  ('Enterprise', 'enterprise', 9999, 79992, 1.0, -1, -1, -1, '["unlimited", "all_features", "sla", "account_manager", "custom_integrations"]', 4);

-- ============================================================
-- 11. FUNCTION: Generate invoice number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_client_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year INT;
  v_seq INT;
  v_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM now())::INT;

  -- Get next sequence for this client/year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)' FOR '') AS INT)
  ), 0) + 1 INTO v_seq
  FROM invoices
  WHERE client_id = p_client_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. FUNCTION: Calculate commission
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_commission(
  p_client_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS TABLE(
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  gst_amount DECIMAL(10,2),
  net_payout DECIMAL(10,2)
) AS $$
DECLARE
  v_rate DECIMAL(5,2);
  v_commission DECIMAL(10,2);
  v_gst DECIMAL(10,2);
  v_net DECIMAL(10,2);
BEGIN
  -- Get client's subscription commission rate
  SELECT sp.commission_rate INTO v_rate
  FROM client_subscriptions cs
  JOIN subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.client_id = p_client_id
    AND cs.status = 'active'
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- Default to 2.5% if no subscription
  IF v_rate IS NULL THEN
    v_rate := 2.5;
  END IF;

  v_commission := ROUND(p_amount * v_rate / 100, 2);
  v_gst := ROUND(v_commission * 0.18, 2);
  v_net := p_amount - v_commission - v_gst;

  RETURN QUERY SELECT v_rate, v_commission, v_gst, v_net;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

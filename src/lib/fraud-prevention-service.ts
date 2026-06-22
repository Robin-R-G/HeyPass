import { supabaseAdmin } from '@/lib/supabase/client';

export interface FraudRule {
  id: string;
  client_id: string;
  rule_type: 'velocity' | 'amount' | 'duplicate' | 'pattern';
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface FraudAlert {
  id: string;
  client_id: string;
  commission_id: string | null;
  rule_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const DEFAULT_RULES = {
  velocity: { max_per_hour: 100, enabled: true },
  amount: { min: 10, max: 500000, enabled: true },
  duplicate: {
    window_minutes: 5,
    enabled: true,
    check_email: true,
    check_amount: false,  // Disabled by default - same-price workshops trigger false positives
  },
  pattern: { spike_threshold: 2.0, enabled: true },
};

class FraudPreventionServiceImpl {
  async listRules(clientId: string): Promise<FraudRule[]> {
    const { data, error } = await supabaseAdmin
      .from('fraud_rules')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Return default rules if none exist
    if (!data || data.length === 0) {
      return this.createDefaultRules(clientId);
    }

    return data;
  }

  async updateRule(clientId: string, ruleId: string, config: Record<string, unknown>): Promise<FraudRule> {
    const { data, error } = await supabaseAdmin
      .from('fraud_rules')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('id', ruleId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async toggleRule(clientId: string, ruleId: string, isActive: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from('fraud_rules')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', ruleId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  async checkTransaction(clientId: string, input: {
    amount: number;
    transaction_id: string;
    event_id?: string;
  }): Promise<{ allowed: boolean; alerts: { rule: string; severity: string; message: string }[] }> {
    const rules = await this.listRules(clientId);
    const alerts: { rule: string; severity: string; message: string }[] = [];

    for (const rule of rules) {
      if (!rule.is_active) continue;

      const check = await this.evaluateRule(rule, input, clientId);
      if (check) {
        alerts.push(check);
      }
    }

    // Create alerts in DB
    for (const alert of alerts) {
      await this.createAlert(clientId, {
        rule_type: alert.rule,
        severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        description: alert.message,
      });
    }

    const hasHighSeverity = alerts.some(a => a.severity === 'high' || a.severity === 'critical');

    return {
      allowed: !hasHighSeverity,
      alerts,
    };
  }

  private async evaluateRule(
    rule: FraudRule,
    input: { amount: number; transaction_id: string; event_id?: string },
    clientId: string
  ): Promise<{ rule: string; severity: string; message: string } | null> {
    const config = rule.config;

    switch (rule.rule_type) {
      case 'velocity': {
        if (!config.enabled) return null;
        // This would need a counter in Redis for production
        // Simplified check
        return null;
      }

      case 'amount': {
        if (!config.enabled) return null;
        const min = (config.min as number) || 10;
        const max = (config.max as number) || 500000;

        if (input.amount < min) {
          return {
            rule: 'amount',
            severity: 'medium',
            message: `Transaction amount ₹${input.amount} below minimum ₹${min}`,
          };
        }
        if (input.amount > max) {
          return {
            rule: 'amount',
            severity: 'high',
            message: `Transaction amount ₹${input.amount} exceeds maximum ₹${max}`,
          };
        }
        return null;
      }

      case 'duplicate': {
        if (!config.enabled) return null;

        const windowMinutes = (config.window_minutes as number) || 5;
        const checkEmail = config.check_email !== false; // default true
        const checkAmount = config.check_amount === true; // default false (disabled for same-price workshops)

        // Get recent payments for this client
        const { data: recentPayments } = await supabaseAdmin
          .from('payments')
          .select('id, amount, metadata, created_at')
          .eq('client_id', clientId)
          .eq('status', 'completed')
          .gte('created_at', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        if (!recentPayments || recentPayments.length === 0) return null;

        // Check for duplicate transaction_id
        const duplicateTx = recentPayments.find(p => {
          const ref = (p.metadata as any)?.payment_reference;
          return ref === input.transaction_id;
        });

        if (duplicateTx) {
          return {
            rule: 'duplicate',
            severity: 'high',
            message: `Duplicate transaction ID detected: ${input.transaction_id}`,
          };
        }

        // Only check amount if explicitly enabled (off by default for same-price workshops)
        if (checkAmount) {
          const sameAmountCount = recentPayments.filter(p => p.amount === input.amount).length;
          if (sameAmountCount >= 3) {
            return {
              rule: 'duplicate',
              severity: 'medium',
              message: `${sameAmountCount + 1} transactions of ₹${input.amount} in last ${windowMinutes} minutes`,
            };
          }
        }

        return null;
      }

      case 'pattern': {
        if (!config.enabled) return null;
        // Would check for unusual spikes
        return null;
      }

      default:
        return null;
    }
  }

  async listAlerts(clientId: string, options?: {
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: FraudAlert[]; total: number }> {
    let query = supabaseAdmin
      .from('fraud_alerts')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (options?.status) query = query.eq('status', options.status);
    if (options?.severity) query = query.eq('severity', options.severity);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { alerts: data || [], total: count || 0 };
  }

  async reviewAlert(alertId: string, userId: string, status: 'reviewed' | 'resolved' | 'flagged'): Promise<void> {
    const { error } = await supabaseAdmin
      .from('fraud_alerts')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
  }

  private async createAlert(clientId: string, input: {
    commission_id?: string;
    rule_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }): Promise<void> {
    await supabaseAdmin.from('fraud_alerts').insert({
      client_id: clientId,
      commission_id: input.commission_id || null,
      rule_type: input.rule_type,
      severity: input.severity,
      description: input.description,
      status: 'pending',
    });
  }

  private async createDefaultRules(clientId: string): Promise<FraudRule[]> {
    const rules: FraudRule[] = [];

    for (const [type, config] of Object.entries(DEFAULT_RULES)) {
      const { data, error } = await supabaseAdmin
        .from('fraud_rules')
        .insert({
          client_id: clientId,
          rule_type: type,
          config,
          is_active: true,
        })
        .select('*')
        .single();

      if (!error && data) {
        rules.push(data);
      }
    }

    return rules;
  }

  async getStats(clientId: string) {
    const { data: alerts } = await supabaseAdmin
      .from('fraud_alerts')
      .select('id, severity, status')
      .eq('client_id', clientId);

    const all = alerts || [];
    return {
      total: all.length,
      pending: all.filter(a => a.status === 'pending').length,
      by_severity: {
        low: all.filter(a => a.severity === 'low').length,
        medium: all.filter(a => a.severity === 'medium').length,
        high: all.filter(a => a.severity === 'high').length,
        critical: all.filter(a => a.severity === 'critical').length,
      },
    };
  }
}

export const fraudPreventionService = new FraudPreventionServiceImpl();

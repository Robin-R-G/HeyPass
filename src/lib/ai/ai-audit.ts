import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function createAIAuditLog(params: {
  client_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('audit_logs').insert({
      client_id: params.client_id,
      user_id: params.user_id,
      action: `ai.${params.action}`,
      resource_type: params.resource_type,
      resource_id: params.resource_id || null,
      new_value: params.details || {},
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
    });
  } catch (err) {
    console.error('[AI Audit] Failed to create audit log:', err);
  }
}

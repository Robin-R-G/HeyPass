import { createClient } from '@supabase/supabase-js';
import type { AIUsageStats, AIUsageLog, PaginatedResponse } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface AIUsageLogInput {
  client_id: string;
  user_id: string;
  provider: string;
  model: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
}

export class AIUsageService {
  async logRequest(log: AIUsageLogInput): Promise<void> {
    const supabase = getSupabase();
    await supabase.from('ai_usage_logs').insert({
      client_id: log.client_id,
      user_id: log.user_id,
      provider: log.provider,
      model: log.model,
      feature: log.feature,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.total_tokens,
      latency_ms: log.latency_ms,
      status: log.status,
      error_message: log.error_message || null,
    });
  }

  async getUsageStats(clientId: string): Promise<AIUsageStats> {
    const supabase = getSupabase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get config for provider/model
    const { data: config } = await supabase
      .from('ai_configurations')
      .select('provider, default_model, connection_status')
      .eq('client_id', clientId)
      .single();

    const provider = (config?.provider || 'openai') as AIUsageStats['provider'];
    const model = config?.default_model || 'unknown';
    const connection_status = (config?.connection_status || 'disconnected') as AIUsageStats['connection_status'];

    // Get today's stats
    const { count: requests_today } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', todayStart);

    // Get this month's stats
    const { count: requests_this_month } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', monthStart);

    // Get token totals
    const { data: todayTokens } = await supabase
      .from('ai_usage_logs')
      .select('total_tokens')
      .eq('client_id', clientId)
      .gte('created_at', todayStart);

    const { data: monthTokens } = await supabase
      .from('ai_usage_logs')
      .select('total_tokens')
      .eq('client_id', clientId)
      .gte('created_at', monthStart);

    // Get average latency
    const { data: latencyData } = await supabase
      .from('ai_usage_logs')
      .select('latency_ms')
      .eq('client_id', clientId)
      .gte('created_at', todayStart)
      .eq('status', 'success');

    // Get recent errors
    const { count: recent_errors } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'error')
      .gte('created_at', todayStart);

    const total_tokens_today = todayTokens?.reduce((sum, r) => sum + (r.total_tokens || 0), 0) || 0;
    const total_tokens_this_month = monthTokens?.reduce((sum, r) => sum + (r.total_tokens || 0), 0) || 0;
    const avg_latency_ms = latencyData && latencyData.length > 0
      ? Math.round(latencyData.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / latencyData.length)
      : 0;

    return {
      provider,
      model,
      requests_today: requests_today || 0,
      requests_this_month: requests_this_month || 0,
      total_tokens_today,
      total_tokens_this_month,
      avg_latency_ms,
      recent_errors: recent_errors || 0,
      connection_status,
    };
  }

  async getUsageHistory(
    clientId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<AIUsageLog>> {
    const supabase = getSupabase();
    const offset = (page - 1) * limit;

    const { count: total } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        page,
        limit,
        total_pages: 0,
      };
    }

    return {
      success: true,
      data: data || [],
      total: total || 0,
      page,
      limit,
      total_pages: Math.ceil((total || 0) / limit),
    };
  }
}

let _service: AIUsageService | null = null;

export function getAIUsageService(): AIUsageService {
  if (!_service) _service = new AIUsageService();
  return _service;
}

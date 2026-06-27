import { createClient } from '@supabase/supabase-js';
import { encryptApiKey, decryptApiKey, maskApiKey } from './encryption';
import { getProvider } from './provider-registry';
import type { AIConfiguration, AIProvider } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface AIConfigResult<T = AIConfiguration> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AIConfigInput {
  provider: AIProvider;
  api_key?: string;
  default_model: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  is_enabled?: boolean;
}

export class AIConfigService {
  async getConfig(clientId: string): Promise<AIConfigResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Configuration not found' };
    }

    return {
      success: true,
      data: {
        ...data,
        api_key_prefix: data.api_key_prefix || null,
      },
    };
  }

  async saveConfig(clientId: string, input: AIConfigInput, userId: string): Promise<AIConfigResult> {
    const supabase = getSupabase();
    const existing = await this.getConfig(clientId);

    let encryptedKey: string | null = null;
    let keyPrefix: string | null = null;

    if (input.api_key) {
      encryptedKey = encryptApiKey(input.api_key);
      keyPrefix = maskApiKey(input.api_key);
    }

    const now = new Date().toISOString();

    if (existing.success && existing.data) {
      const updateData: Record<string, unknown> = {
        provider: input.provider,
        default_model: input.default_model,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens ?? 2048,
        system_prompt: input.system_prompt || null,
        is_enabled: input.is_enabled ?? true,
        updated_by: userId,
        updated_at: now,
        connection_status: 'disconnected',
        last_error: null,
      };

      if (encryptedKey) {
        updateData.api_key_encrypted = encryptedKey;
        updateData.api_key_prefix = keyPrefix;
      }

      const { data, error } = await supabase
        .from('ai_configurations')
        .update(updateData)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: { ...data, api_key_prefix: data.api_key_prefix || null } };
    }

    const insertData: Record<string, unknown> = {
      client_id: clientId,
      provider: input.provider,
      default_model: input.default_model,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.max_tokens ?? 2048,
      system_prompt: input.system_prompt || null,
      is_enabled: input.is_enabled ?? true,
      created_by: userId,
      updated_by: userId,
      connection_status: 'disconnected',
    };

    if (encryptedKey) {
      insertData.api_key_encrypted = encryptedKey;
      insertData.api_key_prefix = keyPrefix;
    }

    const { data, error } = await supabase
      .from('ai_configurations')
      .insert(insertData)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: { ...data, api_key_prefix: data.api_key_prefix || null } };
  }

  async testConnection(clientId: string): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const supabase = getSupabase();
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error || !config) return { success: false, error: 'Configuration not found' };
    if (!config.api_key_encrypted) return { success: false, error: 'No API key configured' };

    const decryptedKey = decryptApiKey(config.api_key_encrypted);
    const provider = getProvider(config.provider);
    const result = await provider.testConnection(decryptedKey, config.default_model);

    const statusUpdate: Record<string, unknown> = {
      connection_status: result.success ? 'connected' : 'error',
      last_connection_at: new Date().toISOString(),
      last_error: result.success ? null : result.error,
    };

    await supabase
      .from('ai_configurations')
      .update(statusUpdate)
      .eq('client_id', clientId);

    return result;
  }

  async deleteConfig(clientId: string, userId: string): Promise<AIConfigResult> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('ai_configurations')
      .delete()
      .eq('client_id', clientId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async toggleEnabled(clientId: string, enabled: boolean): Promise<AIConfigResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_configurations')
      .update({ is_enabled: enabled })
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: { ...data, api_key_prefix: data.api_key_prefix || null } };
  }

  async updateSettings(clientId: string, settings: Partial<AIConfigInput>): Promise<AIConfigResult> {
    const supabase = getSupabase();
    const updateData: Record<string, unknown> = {};

    if (settings.default_model) updateData.default_model = settings.default_model;
    if (settings.temperature !== undefined) updateData.temperature = settings.temperature;
    if (settings.max_tokens !== undefined) updateData.max_tokens = settings.max_tokens;
    if (settings.system_prompt !== undefined) updateData.system_prompt = settings.system_prompt || null;

    const { data, error } = await supabase
      .from('ai_configurations')
      .update(updateData)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: { ...data, api_key_prefix: data.api_key_prefix || null } };
  }

  async getDecryptedConfig(clientId: string): Promise<{ apiKey: string; provider: string; model: string; temperature: number; maxTokens: number; systemPrompt: string | null } | null> {
    const supabase = getSupabase();
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_enabled', true)
      .single();

    if (error || !config || !config.api_key_encrypted) return null;

    return {
      apiKey: decryptApiKey(config.api_key_encrypted),
      provider: config.provider,
      model: config.default_model,
      temperature: config.temperature,
      maxTokens: config.max_tokens,
      systemPrompt: config.system_prompt,
    };
  }
}

let _service: AIConfigService | null = null;

export function getAIConfigService(): AIConfigService {
  if (!_service) _service = new AIConfigService();
  return _service;
}

import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  client_id: string;
  event_id: string | null;
  name: string;
  key_prefix: string;
  scope: string;
  permissions: string[];
  rate_limit: number;
  last_used_at: string | null;
  last_used_ip: string | null;
  ip_whitelist: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateApiKeyInput {
  name: string;
  event_id?: string;
  scope?: 'full' | 'event' | 'read_only' | 'webhook';
  permissions?: string[];
  rate_limit?: number;
  ip_whitelist?: string[];
  expires_at?: string;
}

class ApiKeyServiceImpl {
  private generateKey(): string {
    const prefix = 'hp_';
    const random = crypto.randomBytes(24).toString('hex');
    return prefix + random;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private getPrefix(key: string): string {
    return key.substring(0, 10);
  }

  async list(clientId: string, eventId?: string): Promise<ApiKey[]> {
    let query = supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.or(`event_id.is.null,event_id.eq.${eventId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async get(clientId: string, keyId: string): Promise<ApiKey | null> {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return data;
  }

  async create(clientId: string, input: CreateApiKeyInput): Promise<{ key: string; api_key: ApiKey }> {
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    const keyPrefix = this.getPrefix(key);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        client_id: clientId,
        event_id: input.event_id || null,
        name: input.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scope: input.scope || 'full',
        permissions: input.permissions || [],
        rate_limit: input.rate_limit || 1000,
        ip_whitelist: input.ip_whitelist || null,
        expires_at: input.expires_at || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;

    return { key, api_key: data };
  }

  async update(clientId: string, keyId: string, input: Partial<CreateApiKeyInput & { is_active: boolean }>): Promise<ApiKey> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.event_id !== undefined) updateData.event_id = input.event_id;
    if (input.scope !== undefined) updateData.scope = input.scope;
    if (input.permissions !== undefined) updateData.permissions = input.permissions;
    if (input.rate_limit !== undefined) updateData.rate_limit = input.rate_limit;
    if (input.ip_whitelist !== undefined) updateData.ip_whitelist = input.ip_whitelist;
    if (input.expires_at !== undefined) updateData.expires_at = input.expires_at;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async regenerate(clientId: string, keyId: string): Promise<{ key: string; api_key: ApiKey }> {
    const key = this.generateKey();
    const keyHash = this.hashKey(key);
    const keyPrefix = this.getPrefix(key);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .update({
        key_hash: keyHash,
        key_prefix: keyPrefix,
        updated_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) throw error;
    return { key, api_key: data };
  }

  async delete(clientId: string, keyId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  async validate(key: string): Promise<{ valid: boolean; client_id?: string; event_id?: string; permissions?: string[] }> {
    const keyHash = this.hashKey(key);
    const keyPrefix = this.getPrefix(key);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, client_id, event_id, permissions, scope, is_active, expires_at, rate_limit')
      .eq('key_hash', keyHash)
      .is('deleted_at', null)
      .single();

    if (error || !data) return { valid: false };
    if (!data.is_active) return { valid: false };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false };

    // Update last used
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      valid: true,
      client_id: data.client_id,
      event_id: data.event_id,
      permissions: data.scope === 'full' ? ['*'] : data.permissions,
    };
  }

  async getStats(clientId: string) {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, scope, is_active, last_used_at')
      .eq('client_id', clientId)
      .is('deleted_at', null);

    if (error) throw error;

    const keys = data || [];
    return {
      total: keys.length,
      active: keys.filter(k => k.is_active).length,
      by_scope: {
        full: keys.filter(k => k.scope === 'full').length,
        event: keys.filter(k => k.scope === 'event').length,
        read_only: keys.filter(k => k.scope === 'read_only').length,
        webhook: keys.filter(k => k.scope === 'webhook').length,
      },
      recently_used: keys.filter(k => k.last_used_at).length,
    };
  }
}

export const apiKeyService = new ApiKeyServiceImpl();

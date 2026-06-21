import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface GatewayConfig {
  id: string;
  client_id: string;
  provider: 'razorpay' | 'cashfree';
  is_live: boolean;
  is_active: boolean;
  verified_at: string | null;
  last_webhook_at: string | null;
  created_at: string;
}

export interface CreateGatewayInput {
  provider: 'razorpay' | 'cashfree';
  api_key: string;
  api_secret: string;
  webhook_secret?: string;
  is_live?: boolean;
}

class GatewayConfigServiceImpl {
  private readonly ENCRYPTION_KEY = process.env.BILLING_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  private readonly ALGORITHM = 'aes-256-gcm';

  private encrypt(text: string): string {
    const key = crypto.createHash('sha256').update(this.ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const key = crypto.createHash('sha256').update(this.ENCRYPTION_KEY).digest();
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async list(clientId: string): Promise<GatewayConfig[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_gateway_config')
      .select('id, client_id, provider, is_live, is_active, verified_at, last_webhook_at, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async get(clientId: string, provider: string): Promise<GatewayConfig | null> {
    const { data, error } = await supabaseAdmin
      .from('payment_gateway_config')
      .select('id, client_id, provider, is_live, is_active, verified_at, last_webhook_at, created_at')
      .eq('client_id', clientId)
      .eq('provider', provider)
      .single();

    if (error || !data) return null;
    return data;
  }

  async create(clientId: string, input: CreateGatewayInput): Promise<GatewayConfig> {
    // Check if already exists
    const existing = await this.get(clientId, input.provider);
    if (existing) {
      throw new Error(`Gateway ${input.provider} already configured. Update instead.`);
    }

    const { data, error } = await supabaseAdmin
      .from('payment_gateway_config')
      .insert({
        client_id: clientId,
        provider: input.provider,
        api_key_encrypted: this.encrypt(input.api_key),
        api_secret_encrypted: this.encrypt(input.api_secret),
        webhook_secret_encrypted: input.webhook_secret ? this.encrypt(input.webhook_secret) : null,
        is_live: input.is_live || false,
        is_active: true,
      })
      .select('id, client_id, provider, is_live, is_active, verified_at, last_webhook_at, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async update(clientId: string, provider: string, input: Partial<CreateGatewayInput & { is_active: boolean; is_live: boolean }>): Promise<GatewayConfig> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.api_key !== undefined) updateData.api_key_encrypted = this.encrypt(input.api_key);
    if (input.api_secret !== undefined) updateData.api_secret_encrypted = this.encrypt(input.api_secret);
    if (input.webhook_secret !== undefined) updateData.webhook_secret_encrypted = this.encrypt(input.webhook_secret);
    if (input.is_live !== undefined) updateData.is_live = input.is_live;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabaseAdmin
      .from('payment_gateway_config')
      .update(updateData)
      .eq('client_id', clientId)
      .eq('provider', provider)
      .select('id, client_id, provider, is_live, is_active, verified_at, last_webhook_at, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async delete(clientId: string, provider: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_gateway_config')
      .delete()
      .eq('client_id', clientId)
      .eq('provider', provider);

    if (error) throw error;
  }

  async getDecrypted(clientId: string, provider: string): Promise<{
    api_key: string;
    api_secret: string;
    webhook_secret: string | null;
  } | null> {
    const { data, error } = await supabaseAdmin
      .from('payment_gateway_config')
      .select('api_key_encrypted, api_secret_encrypted, webhook_secret_encrypted')
      .eq('client_id', clientId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      api_key: this.decrypt(data.api_key_encrypted),
      api_secret: this.decrypt(data.api_secret_encrypted),
      webhook_secret: data.webhook_secret_encrypted ? this.decrypt(data.webhook_secret_encrypted) : null,
    };
  }

  async verify(clientId: string, provider: string): Promise<{ valid: boolean; message: string }> {
    const creds = await this.getDecrypted(clientId, provider);
    if (!creds) return { valid: false, message: 'Gateway not configured' };

    try {
      if (provider === 'razorpay') {
        // Razorpay basic auth test
        const auth = Buffer.from(`${creds.api_key}:${creds.api_secret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'GET',
          headers: { 'Authorization': `Basic ${auth}` },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok || response.status === 400) {
          // 400 means auth works but no params - that's fine
          await supabaseAdmin
            .from('payment_gateway_config')
            .update({ verified_at: new Date().toISOString() })
            .eq('client_id', clientId)
            .eq('provider', provider);

          return { valid: true, message: 'Credentials verified' };
        }

        return { valid: false, message: `Verification failed: ${response.status}` };
      }

      if (provider === 'cashfree') {
        // Cashfree basic auth test
        const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
          method: 'GET',
          headers: {
            'x-client-id': creds.api_key,
            'x-client-secret': creds.api_secret,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok || response.status === 400 || response.status === 422) {
          await supabaseAdmin
            .from('payment_gateway_config')
            .update({ verified_at: new Date().toISOString() })
            .eq('client_id', clientId)
            .eq('provider', provider);

          return { valid: true, message: 'Credentials verified' };
        }

        return { valid: false, message: `Verification failed: ${response.status}` };
      }

      return { valid: false, message: 'Unknown provider' };
    } catch (error) {
      return { valid: false, message: (error as Error).message };
    }
  }
}

export const gatewayConfigService = new GatewayConfigServiceImpl();

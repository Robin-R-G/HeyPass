import { createClient } from '@supabase/supabase-js';
import { createWhatsAppProvider, WhatsAppConfigInput } from './provider-interface';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getEncryptionKey(): Buffer {
  const key = process.env.BILLING_ENCRYPTION_KEY;
  if (!key || key.length < 32) throw new Error('BILLING_ENCRYPTION_KEY must be >= 32 chars');
  return Buffer.from(key.slice(0, 32), 'utf8');
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(data: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encrypted] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getConfigInputs(config: any): WhatsAppConfigInput {
  return {
    business_account_id: config.business_account_id,
    phone_number_id: config.phone_number_id,
    meta_app_id: config.meta_app_id,
    meta_app_secret: config.meta_app_secret_encrypted ? decrypt(config.meta_app_secret_encrypted) : undefined,
    access_token: config.access_token_encrypted ? decrypt(config.access_token_encrypted) : undefined,
    webhook_verify_token: config.webhook_verify_token,
    webhook_secret: config.webhook_secret_encrypted ? decrypt(config.webhook_secret_encrypted) : undefined,
  };
}

export interface WhatsAppServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class WhatsAppService {
  private db = getSupabase();

  async getConfig(clientId: string): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }

    // Mask secrets in response
    if (data) {
      data.access_token_encrypted = data.access_token_encrypted ? '***' : null;
      data.meta_app_secret_encrypted = data.meta_app_secret_encrypted ? '***' : null;
      data.webhook_secret_encrypted = data.webhook_secret_encrypted ? '***' : null;
    }

    return { success: true, data };
  }

  async saveConfig(clientId: string, input: Partial<WhatsAppConfigInput & { business_name: string; business_phone: string; default_sender_name: string; default_country_code: string; timezone: string; template_language: string }>): Promise<WhatsAppServiceResult> {
    const updateData: any = {
      client_id: clientId,
      business_name: input.business_name,
      business_phone: input.business_phone,
      default_sender_name: input.default_sender_name,
      default_country_code: input.default_country_code || '+91',
      timezone: input.timezone || 'Asia/Kolkata',
      template_language: input.template_language || 'en',
      updated_at: new Date().toISOString(),
    };

    if (input.business_account_id) updateData.business_account_id = input.business_account_id;
    if (input.phone_number_id) updateData.phone_number_id = input.phone_number_id;
    if (input.meta_app_id) updateData.meta_app_id = input.meta_app_id;
    if (input.access_token) updateData.access_token_encrypted = encrypt(input.access_token);
    if (input.meta_app_secret) updateData.meta_app_secret_encrypted = encrypt(input.meta_app_secret);
    if (input.webhook_verify_token) updateData.webhook_verify_token = input.webhook_verify_token;
    if (input.webhook_secret) updateData.webhook_secret_encrypted = encrypt(input.webhook_secret);

    // Generate webhook URL
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL || 'https://heypass.vercel.app';
    updateData.webhook_url = `${webhookBase}/api/webhooks/whatsapp`;

    // Generate verify token if not set
    if (!updateData.webhook_verify_token) {
      updateData.webhook_verify_token = crypto.randomBytes(32).toString('hex');
    }

    const { data, error } = await this.db
      .from('whatsapp_configs')
      .upsert(updateData, { onConflict: 'client_id' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Mask secrets
    data.access_token_encrypted = data.access_token_encrypted ? '***' : null;
    data.meta_app_secret_encrypted = data.meta_app_secret_encrypted ? '***' : null;
    data.webhook_secret_encrypted = data.webhook_secret_encrypted ? '***' : null;

    return { success: true, data };
  }

  async verifyConnection(clientId: string): Promise<WhatsAppServiceResult> {
    const { data: config, error } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const provider = createWhatsAppProvider(config.provider || 'meta');
    const result = await provider.verifyCredentials(getConfigInputs(config));

    // Update connection status
    await this.db
      .from('whatsapp_configs')
      .update({
        connection_status: result.valid ? 'connected' : 'error',
        last_error: result.error || null,
        error_count: result.valid ? 0 : (config.error_count || 0) + 1,
      })
      .eq('client_id', clientId);

    return { success: result.valid, error: result.error, data: { status: result.valid ? 'connected' : 'error' } };
  }

  async syncTemplates(clientId: string): Promise<WhatsAppServiceResult> {
    const { data: config, error } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const provider = createWhatsAppProvider(config.provider || 'meta');
    const templates = await provider.syncTemplates(getConfigInputs(config));

    // Upsert templates
    for (const template of templates) {
      await this.db
        .from('whatsapp_templates')
        .upsert({
          client_id: clientId,
          config_id: config.id,
          meta_template_id: template.id,
          name: template.name,
          category: template.category,
          language: template.language,
          status: template.status,
          header_type: template.header_type,
          header_text: template.header_text,
          body_text: template.body_text,
          footer_text: template.footer_text,
          buttons: template.buttons,
          variables: template.variables,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'client_id,name' });
    }

    return { success: true, data: templates };
  }

  async getTemplates(clientId: string): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_templates')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async sendMessage(clientId: string, to: string, templateName: string, variables?: Record<string, string>): Promise<WhatsAppServiceResult> {
    const { data: config, error } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const provider = createWhatsAppProvider(config.provider || 'meta');
    const result = await provider.sendTemplate(getConfigInputs(config), to, templateName, variables);

    // Log message
    if (result.messageId) {
      await this.db.from('whatsapp_messages_v2').insert({
        client_id: clientId,
        direction: 'outbound',
        message_type: 'template',
        template_name: templateName,
        template_variables: variables,
        status: 'sent',
        meta_message_id: result.messageId,
        sent_at: new Date().toISOString(),
      });

      // Update daily limit counter
      const today = new Date().toISOString().split('T')[0];
      if (config.messages_sent_date !== today) {
        await this.db
          .from('whatsapp_configs')
          .update({ messages_sent_today: 1, messages_sent_date: today })
          .eq('client_id', clientId);
      } else {
        await this.db
          .from('whatsapp_configs')
          .update({ messages_sent_today: (config.messages_sent_today || 0) + 1 })
          .eq('client_id', clientId);
      }
    }

    return { success: !!result.messageId, data: result, error: result.error };
  }

  async sendTextMessage(clientId: string, to: string, text: string): Promise<WhatsAppServiceResult> {
    const { data: config, error } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const provider = createWhatsAppProvider(config.provider || 'meta');
    const result = await provider.sendText(getConfigInputs(config), to, text);

    if (result.messageId) {
      await this.db.from('whatsapp_messages_v2').insert({
        client_id: clientId,
        direction: 'outbound',
        message_type: 'text',
        message_text: text,
        status: 'sent',
        meta_message_id: result.messageId,
        sent_at: new Date().toISOString(),
      });
    }

    return { success: !!result.messageId, data: result, error: result.error };
  }

  // Contacts
  async getContacts(clientId: string, options?: { page?: number; limit?: number; status?: string; search?: string }): Promise<WhatsAppServiceResult> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    let query = this.db
      .from('whatsapp_contacts')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .is('deleted_at', null);

    if (options?.status) query = query.eq('status', options.status);
    if (options?.search) {
      query = query.or(`phone.ilike.%${options.search}%,name.ilike.%${options.search}%`);
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { success: false, error: error.message };
    return { success: true, data, total: count };
  }

  async upsertContact(clientId: string, contact: { phone: string; name?: string; email?: string; tags?: string[]; segments?: string[]; custom_fields?: Record<string, any> }): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_contacts')
      .upsert({
        client_id: clientId,
        phone: contact.phone,
        name: contact.name,
        email: contact.email,
        tags: contact.tags || [],
        segments: contact.segments || [],
        custom_fields: contact.custom_fields || {},
        source: 'api',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,phone' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async updateContact(clientId: string, contactId: string, updates: Partial<{ name: string; email: string; status: string; lead_status: string; tags: string[]; segments: string[]; custom_fields: Record<string, any> }>): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async deleteContact(clientId: string, contactId: string): Promise<WhatsAppServiceResult> {
    const { error } = await this.db
      .from('whatsapp_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('client_id', clientId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Broadcasts
  async createBroadcast(clientId: string, broadcast: {
    name: string;
    template_id?: string;
    target_type: string;
    target_filter?: any;
    contact_ids?: string[];
    message_text?: string;
    template_variables?: Record<string, string>;
    scheduled_at?: string;
  }): Promise<WhatsAppServiceResult> {
    // Count target contacts
    let contactQuery = this.db
      .from('whatsapp_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (broadcast.target_type === 'manual' && broadcast.contact_ids) {
      contactQuery = contactQuery.in('id', broadcast.contact_ids);
    } else if (broadcast.target_type === 'tags' && broadcast.target_filter?.tags) {
      contactQuery = contactQuery.overlaps('tags', broadcast.target_filter.tags);
    }

    const { count } = await contactQuery;

    const { data, error } = await this.db
      .from('whatsapp_broadcasts')
      .insert({
        client_id: clientId,
        name: broadcast.name,
        template_id: broadcast.template_id,
        target_type: broadcast.target_type,
        target_filter: broadcast.target_filter || {},
        contact_ids: broadcast.contact_ids || [],
        message_text: broadcast.message_text,
        template_variables: broadcast.template_variables,
        scheduled_at: broadcast.scheduled_at,
        status: broadcast.scheduled_at ? 'scheduled' : 'draft',
        total_contacts: count || 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async getBroadcasts(clientId: string): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_broadcasts')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async getBroadcastDeliveries(broadcastId: string, clientId: string): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_broadcast_deliveries')
      .select('*, whatsapp_contacts(phone, name)')
      .eq('broadcast_id', broadcastId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async sendBroadcast(clientId: string, broadcastId: string): Promise<WhatsAppServiceResult> {
    // Get broadcast
    const { data: broadcast, error: bErr } = await this.db
      .from('whatsapp_broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .eq('client_id', clientId)
      .single();

    if (bErr || !broadcast) return { success: false, error: 'Broadcast not found' };
    if (broadcast.status !== 'draft' && broadcast.status !== 'scheduled') {
      return { success: false, error: 'Broadcast already sent or in progress' };
    }

    // Get config
    const { data: config } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (!config) return { success: false, error: 'WhatsApp not configured' };

    // Get template
    const { data: template } = await this.db
      .from('whatsapp_templates')
      .select('*')
      .eq('id', broadcast.template_id)
      .single();

    if (!template) return { success: false, error: 'Template not found' };

    // Get target contacts
    let contactQuery = this.db
      .from('whatsapp_contacts')
      .select('id, phone')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (broadcast.target_type === 'manual' && broadcast.contact_ids?.length > 0) {
      contactQuery = contactQuery.in('id', broadcast.contact_ids);
    } else if (broadcast.target_type === 'tags' && broadcast.target_filter?.tags) {
      contactQuery = contactQuery.overlaps('tags', broadcast.target_filter.tags);
    }

    const { data: contacts } = await contactQuery;
    if (!contacts || contacts.length === 0) {
      return { success: false, error: 'No contacts found for broadcast' };
    }

    // Update broadcast status
    await this.db
      .from('whatsapp_broadcasts')
      .update({ status: 'sending', started_at: new Date().toISOString() })
      .eq('id', broadcastId);

    // Create deliveries and send
    const provider = createWhatsAppProvider(config.provider || 'meta');
    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      // Create delivery record
      const { data: delivery } = await this.db
        .from('whatsapp_broadcast_deliveries')
        .insert({
          broadcast_id: broadcastId,
          contact_id: contact.id,
          client_id: clientId,
          status: 'queued',
        })
        .select()
        .single();

      // Send message
      const result = await provider.sendTemplate(
        getConfigInputs(config),
        contact.phone,
        template.name,
        broadcast.template_variables
      );

      if (result.messageId) {
        await this.db
          .from('whatsapp_broadcast_deliveries')
          .update({
            status: 'sent',
            meta_message_id: result.messageId,
            sent_at: new Date().toISOString(),
          })
          .eq('id', delivery?.id);

        await this.db.from('whatsapp_messages_v2').insert({
          client_id: clientId,
          direction: 'outbound',
          message_type: 'template',
          template_name: template.name,
          status: 'sent',
          meta_message_id: result.messageId,
          sent_at: new Date().toISOString(),
        });

        sentCount++;
      } else {
        await this.db
          .from('whatsapp_broadcast_deliveries')
          .update({
            status: 'failed',
            error_message: result.error,
            failed_at: new Date().toISOString(),
          })
          .eq('id', delivery?.id);
        failedCount++;
      }
    }

    // Update broadcast
    await this.db
      .from('whatsapp_broadcasts')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        delivered_count: 0,
        failed_count: failedCount,
      })
      .eq('id', broadcastId);

    return { success: true, data: { sentCount, failedCount, total: contacts.length } };
  }

  async cancelBroadcast(clientId: string, broadcastId: string): Promise<WhatsAppServiceResult> {
    const { error } = await this.db
      .from('whatsapp_broadcasts')
      .update({ status: 'cancelled' })
      .eq('id', broadcastId)
      .eq('client_id', clientId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async deleteBroadcast(clientId: string, broadcastId: string): Promise<WhatsAppServiceResult> {
    const { error } = await this.db
      .from('whatsapp_broadcasts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', broadcastId)
      .eq('client_id', clientId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Webhook handling
  async processWebhook(body: string, signature: string | null, clientId: string): Promise<WhatsAppServiceResult> {
    // Get config
    const { data: config } = await this.db
      .from('whatsapp_configs')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (!config) return { success: false, error: 'WhatsApp not configured' };

    // Verify signature
    const provider = createWhatsAppProvider(config.provider || 'meta');
    if (signature && !provider.verifySignature(getConfigInputs(config), body, signature)) {
      return { success: false, error: 'Invalid signature' };
    }

    // Parse events
    const events = provider.parseWebhookPayload(body);

    for (const event of events) {
      // Log event
      await this.db.from('whatsapp_webhook_logs').insert({
        client_id: clientId,
        event_type: event.type,
        payload: event,
        processed: true,
      });

      if (event.type === 'status' && event.message_id) {
        // Update message status
        await this.db
          .from('whatsapp_messages_v2')
          .update({
            status: event.status,
            ...(event.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
            ...(event.status === 'read' ? { read_at: new Date().toISOString() } : {}),
            ...(event.status === 'failed' ? { failed_at: new Date().toISOString(), failed_reason: event.error } : {}),
          })
          .eq('meta_message_id', event.message_id)
          .eq('client_id', clientId);

        // Update broadcast delivery
        await this.db
          .from('whatsapp_broadcast_deliveries')
          .update({
            status: event.status,
            ...(event.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
            ...(event.status === 'read' ? { read_at: new Date().toISOString() } : {}),
            ...(event.status === 'failed' ? { failed_at: new Date().toISOString(), error_message: event.error } : {}),
          })
          .eq('meta_message_id', event.message_id)
          .eq('client_id', clientId);

        // Update broadcast counts
        if (event.status === 'delivered' || event.status === 'read' || event.status === 'failed') {
          const delivery = await this.db
            .from('whatsapp_broadcast_deliveries')
            .select('broadcast_id')
            .eq('meta_message_id', event.message_id)
            .single();

          if (delivery?.data?.broadcast_id) {
            const countField = event.status === 'delivered' ? 'delivered_count' : event.status === 'read' ? 'read_count' : 'failed_count';
            await this.db.rpc('increment_broadcast_count', {
              p_broadcast_id: delivery.data.broadcast_id,
              p_field: countField,
            }).catch(() => {
              // RPC may not exist, ignore
            });
          }
        }
      }

      if (event.type === 'message' && event.phone_number) {
        // Upsert contact
        await this.db
          .from('whatsapp_contacts')
          .upsert({
            client_id: clientId,
            phone: event.phone_number,
            source: 'whatsapp',
            last_inbound_at: new Date().toISOString(),
            messages_received: 1,
          }, { onConflict: 'client_id,phone' });

        // Log inbound message
        await this.db.from('whatsapp_messages_v2').insert({
          client_id: clientId,
          direction: 'inbound',
          message_type: 'text',
          message_text: event.text,
          status: 'delivered',
          meta_message_id: event.message_id,
          sent_at: event.timestamp ? new Date(parseInt(event.timestamp) * 1000).toISOString() : new Date().toISOString(),
        });
      }
    }

    return { success: true };
  }

  // Superadmin diagnostics
  async getAllConfigs(): Promise<WhatsAppServiceResult> {
    const { data, error } = await this.db
      .from('whatsapp_configs')
      .select('id, client_id, provider, connection_status, messaging_limit_tier, daily_limit, messages_sent_today, messages_sent_date, last_sync_at, error_count, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
}

let _instance: WhatsAppService | null = null;
export function getWhatsAppService(): WhatsAppService {
  if (!_instance) _instance = new WhatsAppService();
  return _instance;
}

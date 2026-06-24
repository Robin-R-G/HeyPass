import { supabaseAdmin } from '@/lib/supabase/client';

export interface WhatsAppMessage {
  message_id: string;
  client_id: string;
  contact_id: string | null;
  event_id: string | null;
  campaign_id: string | null;
  template_id: string | null;
  message_text: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'outbound' | 'inbound';
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  failed_reason: string | null;
}

export interface WhatsAppTemplate {
  id: string;
  client_id: string;
  name: string;
  category: 'utility' | 'marketing' | 'authentication';
  language: string;
  status: string;
  body_text: string;
  created_at: string;
}

class WhatsAppService {
  private getMetaConfig() {
    return {
      apiToken: process.env.WHATSAPP_API_TOKEN || null,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    };
  }

  /**
   * Send WhatsApp Template Message
   */
  async sendTemplateMessage(params: {
    clientId: string;
    contactId: string;
    eventId?: string;
    campaignId?: string;
    templateName: string;
    language?: string;
    variables?: string[]; // Template variables (e.g. ['John', 'TechConf'])
  }): Promise<WhatsAppMessage> {
    const { clientId, contactId, eventId, campaignId, templateName, language = 'en', variables = [] } = params;

    // 1. Fetch Contact Details
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('crm_contacts')
      .select('phone, name')
      .eq('tenant_id', clientId)
      .eq('id', contactId)
      .single();

    if (contactError || !contact || !contact.phone) {
      throw new Error(`Contact not found or does not have a phone number: ${contactError?.message}`);
    }

    // 2. Fetch Template Definition to store/log body
    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('id, body_text')
      .eq('client_id', clientId)
      .eq('name', templateName)
      .single();

    let bodyText = template?.body_text || `Template message: ${templateName}`;
    variables.forEach((val, idx) => {
      bodyText = bodyText.replace(`{{${idx + 1}}}`, val);
    });

    const messageId = `wamid.HBgL${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    const now = new Date().toISOString();

    const config = this.getMetaConfig();

    if (config.apiToken && config.phoneNumberId) {
      // Execute actual Meta Graph API Call
      try {
        const payload = {
          messaging_product: 'whatsapp',
          to: contact.phone.replace(/[^0-9]/g, ''), // E.164 format
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            components: variables.length > 0 ? [
              {
                type: 'body',
                parameters: variables.map(v => ({ type: 'text', text: v })),
              }
            ] : undefined,
          },
        };

        const res = await fetch(`https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || 'Meta API error');
        }
      } catch (err) {
        // Log message as failed in database
        const failedMsg: WhatsAppMessage = {
          message_id: messageId,
          client_id: clientId,
          contact_id: contactId,
          event_id: eventId || null,
          campaign_id: campaignId || null,
          template_id: template?.id || null,
          message_text: bodyText,
          status: 'failed',
          direction: 'outbound',
          sent_at: now,
          delivered_at: null,
          read_at: null,
          failed_reason: err instanceof Error ? err.message : 'Meta API Connection Failed',
        };
        await supabaseAdmin.from('whatsapp_messages').insert(failedMsg);
        return failedMsg;
      }
    } else {
      console.log(`[WhatsApp Sandbox] Sending Template "${templateName}" to ${contact.name} (${contact.phone}): "${bodyText}"`);
    }

    // Save successful message log
    const waMsg: WhatsAppMessage = {
      message_id: messageId,
      client_id: clientId,
      contact_id: contactId,
      event_id: eventId || null,
      campaign_id: campaignId || null,
      template_id: template?.id || null,
      message_text: bodyText,
      status: 'sent',
      direction: 'outbound',
      sent_at: now,
      delivered_at: null,
      read_at: null,
      failed_reason: null,
    };

    const { error: insertError } = await supabaseAdmin.from('whatsapp_messages').insert(waMsg);
    if (insertError) throw insertError;

    return waMsg;
  }

  /**
   * Send Free Text Manual Message
   */
  async sendTextMessage(params: {
    clientId: string;
    contactId: string;
    eventId?: string;
    text: string;
  }): Promise<WhatsAppMessage> {
    const { clientId, contactId, eventId, text } = params;

    const { data: contact, error: contactError } = await supabaseAdmin
      .from('crm_contacts')
      .select('phone, name')
      .eq('tenant_id', clientId)
      .eq('id', contactId)
      .single();

    if (contactError || !contact || !contact.phone) {
      throw new Error(`Contact not found: ${contactError?.message}`);
    }

    const messageId = `wamid.HBgL${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    const now = new Date().toISOString();

    const config = this.getMetaConfig();

    if (config.apiToken && config.phoneNumberId) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          to: contact.phone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: text },
        };

        const res = await fetch(`https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || 'Meta API error');
        }
      } catch (err) {
        const failedMsg: WhatsAppMessage = {
          message_id: messageId,
          client_id: clientId,
          contact_id: contactId,
          event_id: eventId || null,
          campaign_id: null,
          template_id: null,
          message_text: text,
          status: 'failed',
          direction: 'outbound',
          sent_at: now,
          delivered_at: null,
          read_at: null,
          failed_reason: err instanceof Error ? err.message : 'Meta API Connection Failed',
        };
        await supabaseAdmin.from('whatsapp_messages').insert(failedMsg);
        return failedMsg;
      }
    } else {
      console.log(`[WhatsApp Sandbox] Sending Manual Text to ${contact.name} (${contact.phone}): "${text}"`);
    }

    const waMsg: WhatsAppMessage = {
      message_id: messageId,
      client_id: clientId,
      contact_id: contactId,
      event_id: eventId || null,
      campaign_id: null,
      template_id: null,
      message_text: text,
      status: 'sent',
      direction: 'outbound',
      sent_at: now,
      delivered_at: null,
      read_at: null,
      failed_reason: null,
    };

    const { error: insertError } = await supabaseAdmin.from('whatsapp_messages').insert(waMsg);
    if (insertError) throw insertError;

    return waMsg;
  }

  /**
   * Handle Inbound Webhooks (Status Receipts & Inbound Chats)
   */
  async handleWebhook(payload: any): Promise<void> {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return;

    // A. Handle Status Updates (sent, delivered, read, failed)
    if (value.statuses?.[0]) {
      const statusObj = value.statuses[0];
      const messageId = statusObj.id;
      const status = statusObj.status as 'sent' | 'delivered' | 'read' | 'failed';
      const timestamp = new Date(parseInt(statusObj.timestamp) * 1000).toISOString();
      const failedReason = statusObj.errors?.[0]?.message || null;

      const updateData: any = { status };
      if (status === 'delivered') updateData.delivered_at = timestamp;
      if (status === 'read') updateData.read_at = timestamp;
      if (status === 'failed') updateData.failed_reason = failedReason;

      await supabaseAdmin
        .from('whatsapp_messages')
        .update(updateData)
        .eq('message_id', messageId);

      // Trigger campaign counts aggregation if linked to campaign
      const { data: msg } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('campaign_id, client_id')
        .eq('message_id', messageId)
        .single();

      if (msg?.campaign_id) {
        await this.aggregateCampaignStats(msg.client_id, msg.campaign_id);
      }
    }

    // B. Handle Inbound Messages
    if (value.messages?.[0]) {
      const msgObj = value.messages[0];
      const messageId = msgObj.id;
      const phone = `+${msgObj.from}`;
      const text = msgObj.text?.body || msgObj.button?.text || 'Media Message';
      const timestamp = new Date(parseInt(msgObj.timestamp) * 1000).toISOString();

      // Find tenant ID based on WABA ID
      const wabaId = entry.id;
      // Fetch client settings or configurations that match this wabaId. 
      // For sandbox / fallbacks, we lookup active clients.
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .limit(1)
        .single();

      if (!client) return;

      // Find contact by phone number
      let { data: contact } = await supabaseAdmin
        .from('crm_contacts')
        .select('id')
        .eq('tenant_id', client.id)
        .eq('phone', phone)
        .single();

      // Auto-create contact if it is a new conversation string
      if (!contact) {
        const { data: newContact } = await supabaseAdmin
          .from('crm_contacts')
          .insert({
            tenant_id: client.id,
            name: value.contacts?.[0]?.profile?.name || 'WhatsApp Contact',
            phone: phone,
            source: 'whatsapp_inbound',
            status: 'active',
          })
          .select('id')
          .single();
        contact = newContact;
      }

      if (contact) {
        await supabaseAdmin.from('whatsapp_messages').insert({
          message_id: messageId,
          client_id: client.id,
          contact_id: contact.id,
          message_text: text,
          status: 'read', // Inbound messages are received in read state
          direction: 'inbound',
          sent_at: timestamp,
          read_at: timestamp,
        });
      }
    }
  }

  /**
   * Aggregate stats for campaigns
   */
  async aggregateCampaignStats(clientId: string, campaignId: string): Promise<void> {
    const { data: counts } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('status')
      .eq('client_id', clientId)
      .eq('campaign_id', campaignId);

    if (!counts) return;

    const sent = counts.length;
    const delivered = counts.filter(c => c.status === 'delivered' || c.status === 'read').length;
    const read = counts.filter(c => c.status === 'read').length;
    const failed = counts.filter(c => c.status === 'failed').length;

    await supabaseAdmin
      .from('whatsapp_campaigns')
      .update({
        sent_count: sent,
        delivered_count: delivered,
        read_count: read,
        failed_count: failed,
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
  }

  /**
   * Get Shared Inbox conversations list
   */
  async getConversations(clientId: string, filters?: {
    eventId?: string;
    tag?: string;
    status?: string;
    contactType?: string;
    search?: string;
  }) {
    // Queries contacts who have whatsapp messages, showing their last message.
    let query = supabaseAdmin
      .from('crm_contacts')
      .select(`
        id, name, phone, email, organization, designation, tags, notes, status, engagement_score, source,
        whatsapp_messages!inner(message_text, status, direction, sent_at)
      `)
      .eq('tenant_id', clientId);

    if (filters?.eventId) {
      // Lookup contacts registered for this event
      const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('contact_id')
        .eq('client_id', clientId)
        .eq('event_id', filters.eventId);
      
      const contactIds = (regs || []).map(r => r.contact_id).filter(Boolean);
      query = query.in('id', contactIds);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Format conversations with their last message
    const conversations = (data || []).map((contact: any) => {
      const messages = contact.whatsapp_messages || [];
      // Sort messages descending to get the latest
      messages.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
      const lastMessage = messages[0] || null;

      // Filter by type or tags check if needed
      if (filters?.tag && !contact.tags?.includes(filters.tag)) {
        return null;
      }

      return {
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          tags: contact.tags,
          status: contact.status,
          engagement_score: contact.engagement_score,
          organization: contact.organization,
          designation: contact.designation,
          source: contact.source,
          notes: contact.notes,
        },
        lastMessage: lastMessage ? {
          text: lastMessage.message_text,
          status: lastMessage.status,
          direction: lastMessage.direction,
          sent_at: lastMessage.sent_at,
        } : null,
      };
    }).filter(Boolean);

    // Sort by latest message timestamp
    conversations.sort((a: any, b: any) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.sent_at).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.sent_at).getTime() : 0;
      return timeB - timeA;
    });

    return conversations;
  }

  /**
   * Get message history for a contact
   */
  async getConversationHistory(clientId: string, contactId: string): Promise<WhatsAppMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('client_id', clientId)
      .eq('contact_id', contactId)
      .order('sent_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export const whatsappService = new WhatsAppService();

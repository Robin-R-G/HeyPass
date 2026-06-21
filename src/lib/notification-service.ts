import { supabaseAdmin } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email';

export interface NotificationTemplate {
  id: string;
  client_id: string;
  event_id: string | null;
  type: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  variables: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  client_id: string;
  event_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  type: string;
  subject: string;
  status: string;
  template_id: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export interface SendNotificationInput {
  event_id?: string;
  recipient_email: string;
  recipient_name?: string;
  type: string;
  template_id?: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, unknown>;
  scheduled_at?: string;
}

export interface SendBulkInput {
  event_id?: string;
  recipients: { email: string; name?: string; metadata?: Record<string, unknown> }[];
  type: string;
  template_id?: string;
  subject?: string;
  body?: string;
  scheduled_at?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  marketing_enabled: boolean;
  reminder_enabled: boolean;
  certificate_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

class NotificationServiceImpl {
  // ===== TEMPLATES =====

  async listTemplates(clientId: string, eventId?: string): Promise<NotificationTemplate[]> {
    let query = supabaseAdmin
      .from('notification_templates')
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

  async getTemplate(clientId: string, templateId: string): Promise<NotificationTemplate | null> {
    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .select('*')
      .eq('client_id', clientId)
      .eq('id', templateId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return data;
  }

  async createTemplate(clientId: string, input: {
    event_id?: string;
    type: string;
    name: string;
    subject: string;
    body: string;
    variables?: string[];
  }): Promise<NotificationTemplate> {
    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .insert({
        client_id: clientId,
        event_id: input.event_id || null,
        type: input.type,
        name: input.name,
        subject: input.subject,
        body: input.body,
        variables: input.variables || [],
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateTemplate(clientId: string, templateId: string, input: Partial<{
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
    variables: string[];
  }>): Promise<NotificationTemplate> {
    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTemplate(clientId: string, templateId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notification_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  // ===== NOTIFICATIONS =====

  async list(clientId: string, options?: {
    event_id?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (options?.event_id) query = query.eq('event_id', options.event_id);
    if (options?.type) query = query.eq('type', options.type);
    if (options?.status) query = query.eq('status', options.status);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { notifications: data || [], total: count || 0 };
  }

  async get(notificationId: string): Promise<Notification | null> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async send(clientId: string, input: SendNotificationInput): Promise<Notification> {
    // Get template if provided
    let subject = input.subject || '';
    let body = input.body || '';

    if (input.template_id) {
      const template = await this.getTemplate(clientId, input.template_id);
      if (template) {
        subject = template.subject;
        body = template.body;
      }
    }

    if (!subject || !body) {
      throw new Error('Subject and body are required (either via template or directly)');
    }

    // Create notification record
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        client_id: clientId,
        event_id: input.event_id || null,
        recipient_email: input.recipient_email,
        recipient_name: input.recipient_name || null,
        type: input.type,
        subject,
        body,
        template_id: input.template_id || null,
        metadata: input.metadata || {},
        status: 'queued',
      })
      .select('*')
      .single();

    if (error) throw error;

    // Add to queue
    await supabaseAdmin.from('notification_queue').insert({
      client_id: clientId,
      event_id: input.event_id || null,
      notification_id: notification.id,
      scheduled_at: input.scheduled_at || new Date().toISOString(),
    });

    // Send immediately if no schedule
    if (!input.scheduled_at) {
      await this.processNotification(notification.id);
    }

    return notification;
  }

  async sendBulk(clientId: string, input: SendBulkInput): Promise<{ queued: number; errors: { email: string; error: string }[] }> {
    let queued = 0;
    const errors: { email: string; error: string }[] = [];

    for (const recipient of input.recipients) {
      try {
        await this.send(clientId, {
          event_id: input.event_id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          type: input.type,
          template_id: input.template_id,
          subject: input.subject,
          body: input.body,
          metadata: recipient.metadata,
          scheduled_at: input.scheduled_at,
        });
        queued++;
      } catch (err) {
        errors.push({ email: recipient.email, error: (err as Error).message });
      }
    }

    return { queued, errors };
  }

  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.get(notificationId);
    if (!notification || notification.status !== 'queued') return;

    // Update status to sending
    await supabaseAdmin
      .from('notifications')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    try {
      const result = await sendEmail({
        to: notification.recipient_email,
        subject: notification.subject,
        html: notification.body,
      });

      // Update status to sent
      await supabaseAdmin
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sendgrid_message_id: result?.messageId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      // Update queue
      await supabaseAdmin
        .from('notification_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('notification_id', notificationId);

    } catch (error) {
      const errorMessage = (error as Error).message;

      // Get current attempts
      const { data: queue } = await supabaseAdmin
        .from('notification_queue')
        .select('attempts, max_attempts')
        .eq('notification_id', notificationId)
        .single();

      const attempts = (queue?.attempts || 0) + 1;
      const maxAttempts = queue?.max_attempts || 3;

      if (attempts >= maxAttempts) {
        // Mark as failed
        await supabaseAdmin
          .from('notifications')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notificationId);

        await supabaseAdmin
          .from('notification_queue')
          .update({
            status: 'failed',
            attempts,
            last_error: errorMessage,
          })
          .eq('notification_id', notificationId);
      } else {
        // Retry later
        await supabaseAdmin
          .from('notification_queue')
          .update({
            status: 'pending',
            attempts,
            last_error: errorMessage,
            scheduled_at: new Date(Date.now() + attempts * 60 * 1000).toISOString(), // Exponential backoff
          })
          .eq('notification_id', notificationId);
      }
    }
  }

  async getStats(clientId: string, eventId?: string) {
    let query = supabaseAdmin
      .from('notifications')
      .select('id, status, type, created_at')
      .eq('client_id', clientId);

    if (eventId) query = query.eq('event_id', eventId);

    const { data, error } = await query;
    if (error) throw error;

    const notifications = data || [];
    return {
      total: notifications.length,
      by_status: {
        queued: notifications.filter(n => n.status === 'queued').length,
        sending: notifications.filter(n => n.status === 'sending').length,
        sent: notifications.filter(n => n.status === 'sent').length,
        delivered: notifications.filter(n => n.status === 'delivered').length,
        opened: notifications.filter(n => n.status === 'opened').length,
        clicked: notifications.filter(n => n.status === 'clicked').length,
        failed: notifications.filter(n => n.status === 'failed').length,
      },
      by_type: this.groupBy(notifications, 'type'),
      today: notifications.filter(n => {
        const today = new Date().toISOString().split('T')[0];
        return n.created_at.startsWith(today);
      }).length,
    };
  }

  // ===== PREFERENCES =====

  async getPreferences(userId: string, clientId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single();

    if (error || !data) {
      return {
        email_enabled: true,
        marketing_enabled: true,
        reminder_enabled: true,
        certificate_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      };
    }

    return {
      email_enabled: data.email_enabled,
      marketing_enabled: data.marketing_enabled,
      reminder_enabled: data.reminder_enabled,
      certificate_enabled: data.certificate_enabled,
      quiet_hours_start: data.quiet_hours_start,
      quiet_hours_end: data.quiet_hours_end,
    };
  }

  async updatePreferences(userId: string, clientId: string, input: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        client_id: clientId,
        ...input,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      email_enabled: data.email_enabled,
      marketing_enabled: data.marketing_enabled,
      reminder_enabled: data.reminder_enabled,
      certificate_enabled: data.certificate_enabled,
      quiet_hours_start: data.quiet_hours_start,
      quiet_hours_end: data.quiet_hours_end,
    };
  }

  // ===== HELPERS =====

  renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  private groupBy(arr: unknown[], key: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of arr) {
      const val = (item as Record<string, unknown>)[key] as string;
      result[val] = (result[val] || 0) + 1;
    }
    return result;
  }
}

export const notificationService = new NotificationServiceImpl();

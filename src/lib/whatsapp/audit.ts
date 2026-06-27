import { supabaseAdmin } from '@/lib/supabase/client';

export type WhatsAppAuditAction =
  | 'config.save'
  | 'config.verify'
  | 'config.delete'
  | 'template.sync'
  | 'template.create'
  | 'template.delete'
  | 'contact.upsert'
  | 'contact.delete'
  | 'message.send'
  | 'broadcast.create'
  | 'broadcast.send'
  | 'broadcast.cancel'
  | 'inbox.reply'
  | 'inbox.assign'
  | 'inbox.status_update'
  | 'webhook.received'
  | 'webhook.error';

interface AuditLogParams {
  client_id: string;
  user_id?: string;
  action: WhatsAppAuditAction;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export async function createWhatsAppAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await supabaseAdmin.from('whatsapp_audit_logs').insert({
      client_id: params.client_id,
      user_id: params.user_id || null,
      action: params.action,
      resource_type: params.resource_type || null,
      resource_id: params.resource_id || null,
      details: params.details || {},
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
    });
  } catch (err) {
    console.error('[WhatsApp Audit] Failed to write audit log:', err);
  }
}

export async function getWhatsAppAuditLogs(
  clientId: string,
  options?: {
    action?: WhatsAppAuditAction;
    resource_type?: string;
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
  }
): Promise<{ data: unknown[]; total: number }> {
  let query = supabaseAdmin
    .from('whatsapp_audit_logs')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId);

  if (options?.action) query = query.eq('action', options.action);
  if (options?.resource_type) query = query.eq('resource_type', options.resource_type);
  if (options?.from) query = query.gte('created_at', options.from);
  if (options?.to) query = query.lte('created_at', options.to);

  query = query
    .order('created_at', { ascending: false })
    .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[WhatsApp Audit] Query error:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

import { supabaseAdmin } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.failed_login'
  | 'auth.password_reset_request'
  | 'auth.password_reset_complete'
  | 'auth.session_compromised'
  | 'auth.password_change'
  | 'role.change'
  | 'event.create'
  | 'event.update'
  | 'event.delete'
  | 'event.clone'
  | 'ticket.validate'
  | 'check_in.perform'
  | 'check_out.perform'
  | 'certificate.generate'
  | 'certificate.verify'
  | 'billing.action'
  | 'member.add'
  | 'member.remove'
  | 'member.update'
  | 'member.role_change'
  | 'settings.update'
  | 'volunteer.status_update'
  | 'volunteer.assign'
  | 'volunteer.unassign'
  | 'invitation.create'
  | 'invitation.accept'
  | 'invitation.revoke'
  | 'org.admin_create'
  | 'org.admin_update'
  | 'org.admin_delete'
  | 'user.admin_update'
  | 'user.admin_delete'
  | 'config.save'
  | 'config.verify'
  | 'config.delete'
  | 'template.sync'
  | 'contact.upsert'
  | 'contact.delete'
  | 'message.send'
  | 'broadcast.create'
  | 'broadcast.send'
  | 'broadcast.cancel';

export async function createAuditLog(params: {
  client_id?: string | null;
  user_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
}) {
  const {
    client_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_value,
    new_value,
    ip_address,
    user_agent,
    request_id,
  } = params;

  // Fire and forget - audit failures should not block the main flow
  supabaseAdmin
    .from('audit_logs')
    .insert({
      id: uuidv4(),
      client_id,
      user_id,
      action,
      resource_type,
      resource_id: resource_id || null,
      old_value: old_value ? JSON.parse(JSON.stringify(old_value)) : null,
      new_value: new_value ? JSON.parse(JSON.stringify(new_value)) : null,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
      request_id: request_id || null,
      created_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) {
        console.error('Audit log insert failed:', error);
      }
    });
}

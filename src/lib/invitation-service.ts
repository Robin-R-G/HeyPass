import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { sendInvitationEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface Invitation {
  id: string;
  client_id: string;
  email: string;
  role_id: string | null;
  department: string | null;
  phone: string | null;
  token: string;
  invitation_code: string | null;
  invitation_type: 'email' | 'link' | 'code';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
  message: string | null;
  created_at: string;
}

export interface CreateInvitationParams {
  client_id: string;
  email: string;
  role_id?: string;
  department?: string;
  phone?: string;
  invitation_type?: 'email' | 'link' | 'code';
  message?: string;
  invited_by: string;
  expiry_days?: number;
}

class InvitationService {
  async createInvitation(params: CreateInvitationParams): Promise<Invitation> {
    const {
      client_id, email, role_id, department, phone,
      invitation_type = 'email', message, invited_by, expiry_days = 7
    } = params;

    // Check for existing pending invitation
    const { data: existing } = await supabaseAdmin
      .from('client_invitations')
      .select('id')
      .eq('client_id', client_id)
      .eq('email', email)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .single();

    if (existing) {
      throw new Error('An active invitation already exists for this email');
    }

    // Check if user is already a member
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (user) {
      const { data: membership } = await supabaseAdmin
        .from('client_memberships')
        .select('id')
        .eq('client_id', client_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (membership) {
        throw new Error('User is already a member of this organization');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const invitation_code = invitation_type === 'code'
      ? `${client_id.slice(0, 4).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      : null;

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expiry_days);

    const { data: invitation, error } = await supabaseAdmin
      .from('client_invitations')
      .insert({
        client_id,
        email,
        role_id: role_id || null,
        department: department || null,
        phone: phone || null,
        token,
        invitation_code,
        invitation_type,
        status: 'pending',
        expires_at: expires_at.toISOString(),
        invited_by,
        message: message || null,
      })
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      user_id: invited_by,
      client_id,
      action: 'invitation.create',
      resource_type: 'invitation',
      resource_id: invitation.id,
      new_value: { email, role_id, invitation_type },
    });

    // Send invitation email
    try {
      const { data: inviter } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', invited_by)
        .single();

      const { data: org } = await supabaseAdmin
        .from('clients')
        .select('name')
        .eq('id', client_id)
        .single();

      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('name')
        .eq('id', role_id || '')
        .single();

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://heypass.com';
      const invitationLink = `${appUrl}/auth/accept-invite?token=${token}`;

      await sendInvitationEmail(
        email,
        inviter ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email : 'An administrator',
        org?.name || 'the organization',
        role?.name || 'Member',
        invitationLink,
        expires_at.toISOString(),
        message || undefined
      );
    } catch (emailErr) {
      // Don't fail invitation creation if email fails
      console.error('[Invitation] Failed to send invitation email:', emailErr);
    }

    return invitation;
  }

  async getInvitations(clientId: string, options?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ invitations: Invitation[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('client_invitations')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { invitations: data || [], total: count || 0 };
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await supabaseAdmin
      .from('client_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await supabaseAdmin
        .from('client_invitations')
        .update({ status: 'expired' })
        .eq('id', data.id);
      return null;
    }

    return data;
  }

  async getInvitationByCode(code: string, clientId: string): Promise<Invitation | null> {
    const { data, error } = await supabaseAdmin
      .from('client_invitations')
      .select('*')
      .eq('invitation_code', code)
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    if (new Date(data.expires_at) < new Date()) {
      await supabaseAdmin
        .from('client_invitations')
        .update({ status: 'expired' })
        .eq('id', data.id);
      return null;
    }

    return data;
  }

  async acceptInvitation(token: string, userId: string): Promise<{ membership_id: string }> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if user email matches invitation
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (!user || user.email !== invitation.email) {
      throw new Error('Invitation email does not match your account');
    }

    // Check for existing membership
    const { data: existingMembership } = await supabaseAdmin
      .from('client_memberships')
      .select('id')
      .eq('client_id', invitation.client_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (existingMembership) {
      throw new Error('You are already a member of this organization');
    }

    // Create membership
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('client_memberships')
      .insert({
        client_id: invitation.client_id,
        user_id: userId,
        role_id: invitation.role_id,
        status: 'active',
        department: invitation.department,
        phone: invitation.phone,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
        invited_by: invitation.invited_by,
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Update invitation status
    await supabaseAdmin
      .from('client_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // Update user status
    await supabaseAdmin
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId);

    await createAuditLog({
      user_id: userId,
      client_id: invitation.client_id,
      action: 'invitation.accept',
      resource_type: 'invitation',
      resource_id: invitation.id,
      new_value: { email: invitation.email, role_id: invitation.role_id },
    });

    return { membership_id: membership.id };
  }

  async revokeInvitation(invitationId: string, clientId: string, revokedBy: string): Promise<void> {
    const { data: invitation, error } = await supabaseAdmin
      .from('client_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !invitation) {
      throw new Error('Invitation not found or already processed');
    }

    await createAuditLog({
      user_id: revokedBy,
      client_id: clientId,
      action: 'invitation.revoke',
      resource_type: 'invitation',
      resource_id: invitationId,
      old_value: { email: invitation.email },
    });
  }

  async deleteInvitation(invitationId: string, clientId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('client_invitations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('client_id', clientId);

    if (error) throw error;
  }
}

export const invitationService = new InvitationService();

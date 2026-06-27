import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { cacheDelete } from '@/lib/cache';

export interface TeamMember {
  id: string;
  user_id: string;
  client_id: string;
  role_id: string | null;
  status: 'active' | 'invited' | 'suspended';
  department: string | null;
  phone: string | null;
  invited_at: string | null;
  joined_at: string | null;
  last_login_at: string | null;
  invited_by: string | null;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  role?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface UpdateMemberParams {
  role_id?: string;
  department?: string;
  phone?: string;
  status?: 'active' | 'suspended';
}

class TeamManagementService {
  async getMembers(clientId: string, options?: {
    status?: string;
    search?: string;
    role_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ members: TeamMember[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('client_memberships')
      .select(`
        *,
        user:users(id, email, first_name, last_name, avatar_url),
        role:roles(id, name, slug)
      `, { count: 'exact' })
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.role_id) {
      query = query.eq('role_id', options.role_id);
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    let members = (data || []) as any[];

    // Apply search filter (client-side since it's across joined tables)
    if (options?.search) {
      const search = options.search.toLowerCase();
      members = members.filter(m =>
        m.user?.email?.toLowerCase().includes(search) ||
        m.user?.first_name?.toLowerCase().includes(search) ||
        m.user?.last_name?.toLowerCase().includes(search)
      );
    }

    return { members, total: count || 0 };
  }

  async getMember(clientId: string, membershipId: string): Promise<TeamMember | null> {
    const { data, error } = await supabaseAdmin
      .from('client_memberships')
      .select(`
        *,
        user:users(id, email, first_name, last_name, avatar_url),
        role:roles(id, name, slug)
      `)
      .eq('id', membershipId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return data as any;
  }

  async updateMember(
    clientId: string,
    membershipId: string,
    params: UpdateMemberParams,
    updatedBy: string
  ): Promise<TeamMember> {
    const { data: existing } = await supabaseAdmin
      .from('client_memberships')
      .select('*')
      .eq('id', membershipId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      throw new Error('Member not found');
    }

    // Prevent removing the last owner
    if (existing.role_id && params.role_id && params.role_id !== existing.role_id) {
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('slug')
        .eq('id', existing.role_id)
        .single();

      if (role?.slug === 'owner') {
        const { count } = await supabaseAdmin
          .from('client_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('role_id', existing.role_id)
          .eq('status', 'active')
          .is('deleted_at', null);

        if (count && count <= 1) {
          throw new Error('Cannot remove the last owner. Assign another owner first.');
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (params.role_id !== undefined) updates.role_id = params.role_id;
    if (params.department !== undefined) updates.department = params.department;
    if (params.phone !== undefined) updates.phone = params.phone;
    if (params.status !== undefined) updates.status = params.status;

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const { data: member, error } = await supabaseAdmin
      .from('client_memberships')
      .update(updates)
      .eq('id', membershipId)
      .select(`
        *,
        user:users(id, email, first_name, last_name, avatar_url),
        role:roles(id, name, slug)
      `)
      .single();

    if (error) throw error;

    await createAuditLog({
      user_id: updatedBy,
      client_id: clientId,
      action: 'member.update',
      resource_type: 'membership',
      resource_id: membershipId,
      old_value: existing,
      new_value: updates,
    });

    // Invalidate user's cached permissions
    if (params.role_id) {
      await cacheDelete(`permissions:${existing.user_id}:${clientId}`);
    }

    return member as any;
  }

  async removeMember(
    clientId: string,
    membershipId: string,
    removedBy: string
  ): Promise<void> {
    const { data: existing } = await supabaseAdmin
      .from('client_memberships')
      .select('*')
      .eq('id', membershipId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      throw new Error('Member not found');
    }

    // Prevent removing the last owner
    const { data: role } = await supabaseAdmin
      .from('roles')
      .select('slug')
      .eq('id', existing.role_id)
      .single();

    if (role?.slug === 'owner') {
      const { count } = await supabaseAdmin
        .from('client_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('role_id', existing.role_id)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (count && count <= 1) {
        throw new Error('Cannot remove the last owner. Assign another owner first.');
      }
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('client_memberships')
      .update({ deleted_at: new Date().toISOString(), status: 'suspended' })
      .eq('id', membershipId);

    if (error) throw error;

    // Invalidate user's cached permissions
    await cacheDelete(`permissions:${existing.user_id}:${clientId}`);

    await createAuditLog({
      user_id: removedBy,
      client_id: clientId,
      action: 'member.remove',
      resource_type: 'membership',
      resource_id: membershipId,
      old_value: { user_id: existing.user_id, role_id: existing.role_id },
    });
  }

  async suspendMember(
    clientId: string,
    membershipId: string,
    suspendedBy: string
  ): Promise<void> {
    return this.updateMember(clientId, membershipId, { status: 'suspended' }, suspendedBy)
      .then(() => {});
  }

  async reactivateMember(
    clientId: string,
    membershipId: string,
    reactivatedBy: string
  ): Promise<void> {
    return this.updateMember(clientId, membershipId, { status: 'active' }, reactivatedBy)
      .then(() => {});
  }

  async changeRole(
    clientId: string,
    membershipId: string,
    newRoleId: string,
    changedBy: string
  ): Promise<TeamMember> {
    return this.updateMember(clientId, membershipId, { role_id: newRoleId }, changedBy);
  }

  async getMemberStats(clientId: string): Promise<{
    total: number;
    active: number;
    invited: number;
    suspended: number;
    by_role: Record<string, number>;
  }> {
    const { data: members } = await supabaseAdmin
      .from('client_memberships')
      .select('status, role:roles(slug)')
      .eq('client_id', clientId)
      .is('deleted_at', null);

    if (!members) return { total: 0, active: 0, invited: 0, suspended: 0, by_role: {} };

    const stats = {
      total: members.length,
      active: 0,
      invited: 0,
      suspended: 0,
      by_role: {} as Record<string, number>,
    };

    for (const m of members) {
      if (m.status === 'active') stats.active++;
      if (m.status === 'invited') stats.invited++;
      if (m.status === 'suspended') stats.suspended++;

      const roleSlug = (m.role as any)?.slug || 'unknown';
      stats.by_role[roleSlug] = (stats.by_role[roleSlug] || 0) + 1;
    }

    return stats;
  }
}

export const teamService = new TeamManagementService();

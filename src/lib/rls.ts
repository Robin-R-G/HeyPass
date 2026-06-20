import { supabaseAdmin } from '@/lib/supabase/client';

export async function setRlsContext(
  userId: string,
  clientId?: string,
  role?: string
): Promise<void> {
  // RPC-based approach (requires set_rls_context function in DB)
  // This is a fallback - actual RLS uses JWT claims via get_client_id() etc.
  try {
    await supabaseAdmin.rpc('set_rls_context' as any, {
      p_user_id: userId,
      p_client_id: clientId || null,
      p_role: role || null,
    });
  } catch (error) {
    // RPC function may not exist yet - this is expected in MVP
    // RLS policies fall back to JWT claims
    console.warn('[RLS] set_rls_context RPC not available, using JWT claims fallback');
  }
}

export async function withClientRLS<T>(
  userId: string,
  clientId: string,
  operation: () => Promise<T>
): Promise<T> {
  await setRlsContext(userId, clientId);
  return operation();
}

export async function getClientIdFromJWT(payload: {
  client_id?: string | null;
}): Promise<string | null> {
  return payload.client_id || null;
}

export async function getUserClientId(userId: string): Promise<string | null> {
  const { data: membership } = await supabaseAdmin
    .from('client_memberships')
    .select('client_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return membership?.client_id || null;
}

export async function getUserRoleInClient(
  userId: string,
  clientId: string
): Promise<string | null> {
  const { data: membership } = await supabaseAdmin
    .from('client_memberships')
    .select(`
      role:roles(slug)
    `)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single();

  if (!membership?.role) return null;
  return (membership.role as { slug: string }).slug;
}

import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';

// GET /api/superadmin/users - List all users (superadmin)
export const GET = withAuth(async (req: NextRequest, auth) => {
  if (!auth.is_superadmin) return errorResponse('Forbidden', 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select(`
      id, email, first_name, last_name, avatar_url, status,
      is_superadmin, created_at, last_login_at, invitation_code,
      memberships:client_memberships(
        id, client_id, status, role:roles(name, slug),
        client:clients(name, slug)
      )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const { data: users, count, error } = await query.range(offset, offset + limit - 1);

  if (error) return errorResponse(error.message, 400);

  return successResponse({
    users: users || [],
    total: count || 0,
    page,
    limit,
    pages: Math.ceil((count || 0) / limit),
  });
});

// POST /api/superadmin/users - Create user + org (superadmin)
export const POST = withAuth(async (req: NextRequest, auth) => {
  if (!auth.is_superadmin) return errorResponse('Forbidden', 403);

  const body = await req.json();
  const {
    email, password, first_name, last_name,
    organization_name, organization_slug,
    subscription_plan, role = 'owner',
  } = body;

  if (!email || !password || !organization_name) {
    return errorResponse('email, password, and organization_name are required');
  }

  // Create Supabase auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return errorResponse(authError.message, 400);

  // Create user profile
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      status: 'active',
      is_superadmin: false,
    });

  if (userError) return errorResponse(userError.message, 400);

  // Create organization
  const slug = organization_slug || organization_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const { data: org, error: orgError } = await supabase
    .from('clients')
    .insert({
      name: organization_name,
      slug,
      subscription_plan: subscription_plan || 'free',
      status: 'active',
    })
    .select()
    .single();

  if (orgError) return errorResponse(orgError.message, 400);

  // Get the role for this client
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('client_id', org.id)
    .eq('slug', role)
    .single();

  // Create membership
  const { error: memberError } = await supabase
    .from('client_memberships')
    .insert({
      client_id: org.id,
      user_id: authUser.user.id,
      role_id: roleData?.id || null,
      status: 'active',
      joined_at: new Date().toISOString(),
    });

  if (memberError) return errorResponse(memberError.message, 400);

  await createAuditLog({
    user_id: auth.userId,
    client_id: org.id,
    action: 'org.admin_create',
    resource_type: 'client',
    resource_id: org.id,
    new_value: { name: organization_name, slug, owner_email: email },
  });

  return successResponse({
    user: { id: authUser.user.id, email, first_name, last_name },
    organization: org,
  }, 201);
});

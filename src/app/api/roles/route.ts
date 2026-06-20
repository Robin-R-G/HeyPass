import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS, canManageRole } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

// GET /api/roles — List roles for current client
export const GET = withAuth(async (_req: NextRequest, auth) => {
  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .eq('client_id', auth.clientId)
    .is('deleted_at', null)
    .order('priority', { ascending: false });

  return successResponse({ roles: roles || [] });
});

// POST /api/roles — Create a new role (Owner only)
export const POST = withPermission(async (req: NextRequest, auth) => {
  const body = await req.json();
  const { name, slug, description, priority } = body;

  if (!name || !slug) {
    return errorResponse('Name and slug are required');
  }

  const { data: role, error } = await supabase
    .from('roles')
    .insert({
      client_id: auth.clientId,
      name,
      slug,
      description: description || null,
      priority: priority || 0,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }

  await createAuditLog({
    user_id: auth.userId,
    client_id: auth.clientId,
    action: 'auth.register',
    resource_type: 'role',
    resource_id: role.id,
    new_value: { name, slug, priority },
  });

  return successResponse({ role }, 201);
}, PERMISSIONS.ROLES_CREATE);

// PUT /api/roles — Update a role (Owner only)
export const PUT = withPermission(async (req: NextRequest, auth) => {
  const body = await req.json();
  const { id, name, slug, description, priority } = body;

  if (!id) {
    return errorResponse('Role ID is required');
  }

  // Verify role belongs to client
  const { data: existing } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .single();

  if (!existing) {
    return errorResponse('Role not found', 404);
  }

  // Cannot edit system roles
  if (existing.is_system) {
    return errorResponse('Cannot edit system roles');
  }

  const { data: role, error } = await supabase
    .from('roles')
    .update({
      name: name || existing.name,
      slug: slug || existing.slug,
      description: description !== undefined ? description : existing.description,
      priority: priority !== undefined ? priority : existing.priority,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }

  await createAuditLog({
    user_id: auth.userId,
    client_id: auth.clientId,
    action: 'auth.register',
    resource_type: 'role',
    resource_id: role.id,
    old_value: { name: existing.name, slug: existing.slug, priority: existing.priority },
    new_value: { name: role.name, slug: role.slug, priority: role.priority },
  });

  return successResponse({ role });
}, PERMISSIONS.ROLES_EDIT);

// DELETE /api/roles — Delete a role (Owner only)
export const DELETE = withPermission(async (req: NextRequest, auth) => {
  const { id } = await req.json();

  if (!id) {
    return errorResponse('Role ID is required');
  }

  const { data: existing } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .single();

  if (!existing) {
    return errorResponse('Role not found', 404);
  }

  if (existing.is_system) {
    return errorResponse('Cannot delete system roles');
  }

  // Soft delete
  const { error } = await supabase
    .from('roles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return errorResponse(error.message, 400);
  }

  await createAuditLog({
    user_id: auth.userId,
    client_id: auth.clientId,
    action: 'auth.register',
    resource_type: 'role',
    resource_id: id,
    old_value: { name: existing.name, slug: existing.slug },
  });

  return successResponse({ deleted: true });
}, PERMISSIONS.ROLES_DELETE);

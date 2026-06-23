import { supabase } from '@/lib/supabase/client';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import type { NextRequest } from 'next/server';

// GET /api/events — List events (viewable by all authenticated users)
export const GET = withAuth(async (req: NextRequest, auth) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const includeDeleted = searchParams.get('include_deleted') === 'true';

  let query = supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false });

  // Superadmins see all events; regular users see only their client's events
  if (auth.clientId && !auth.is_superadmin) {
    query = query.eq('client_id', auth.clientId);
  }

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: events, error } = await query;

  if (error) return errorResponse(error.message, 400);
  return successResponse({ events: events || [] });
});

// POST /api/events — Create event (Manager+)
export const POST = withPermission(async (req: NextRequest, auth) => {
  const body = await req.json();
  const {
    title, slug, subtitle, description, event_type, start_date, end_date,
    max_capacity, timezone, is_public, is_virtual, virtual_link,
    is_free, ticket_price, currency, payment_method_ids,
  } = body;

  if (!title || !slug || !event_type || !start_date || !end_date) {
    return errorResponse('title, slug, event_type, start_date, end_date are required');
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      client_id: auth.clientId,
      title,
      slug,
      subtitle: subtitle || null,
      description: description || null,
      event_type,
      status: 'draft',
      start_date,
      end_date,
      max_capacity: max_capacity || null,
      timezone: timezone || 'UTC',
      is_public: is_public ?? true,
      is_virtual: is_virtual ?? false,
      virtual_link: virtual_link || null,
      is_free: is_free ?? true,
      ticket_price: ticket_price || 0,
      currency: currency || 'INR',
      payment_method_ids: payment_method_ids || [],
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 400);

  await createAuditLog({
    user_id: auth.userId,
    client_id: auth.clientId,
    action: 'event.create',
    resource_type: 'event',
    resource_id: event.id,
    new_value: { title, slug, event_type, start_date, end_date, is_free, ticket_price },
  });

  return successResponse({ event }, 201);
}, PERMISSIONS.EVENTS_CREATE);

// PATCH /api/events — Update event with pricing (Manager+)
export const PATCH = withPermission(async (req: NextRequest, auth) => {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return errorResponse('Event ID is required');

  const { data: existing } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .single();

  if (!existing) return errorResponse('Event not found', 404);

  if (existing.status === 'completed') {
    return errorResponse('Cannot modify a completed event');
  }

  const allowedUpdates: Record<string, unknown> = {};
  const allowedFields = [
    'title', 'slug', 'subtitle', 'description', 'event_type', 'status',
    'start_date', 'end_date', 'timezone', 'max_capacity', 'is_virtual',
    'virtual_link', 'is_public', 'banner_url', 'thumbnail_url',
    'is_free', 'ticket_price', 'currency', 'payment_method_ids',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field];
    }
  }

  allowedUpdates.updated_at = new Date().toISOString();

  const { data: event, error } = await supabase
    .from('events')
    .update(allowedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 400);

  await createAuditLog({
    user_id: auth.userId,
    client_id: auth.clientId,
    action: 'event.update',
    resource_type: 'event',
    resource_id: id,
    old_value: existing,
    new_value: allowedUpdates,
  });

  return successResponse({ event });
}, PERMISSIONS.EVENTS_EDIT);

// DELETE /api/events — Delete event (Admin+)
export const DELETE = withPermission(async (req: NextRequest, auth) => {
  const { id } = await req.json();

  if (!id) return errorResponse('Event ID is required');

  const { data: existing } = await supabase
    .from('events')
    .select('id, title, status')
    .eq('id', id)
    .eq('client_id', auth.clientId)
    .single();

  if (!existing) return errorResponse('Event not found', 404);

  const { error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
    .eq('id', id);

  if (error) return errorResponse(error.message, 400);

  await createAuditLog({
    user_id: auth.userId,
    client_id: auth.clientId,
    action: 'event.delete',
    resource_type: 'event',
    resource_id: id,
    old_value: { title: existing.title, status: existing.status },
  });

  return successResponse({ deleted: true });
}, PERMISSIONS.EVENTS_DELETE);

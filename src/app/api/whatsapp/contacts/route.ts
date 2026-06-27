import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const status = url.searchParams.get('status') || undefined;
  const search = url.searchParams.get('search') || undefined;

  const service = getWhatsAppService();
  const result = await service.getContacts(auth.clientId!, { page, limit, status, search });

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get contacts', 500);
  }

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_CONTACTS);

export const POST = withPermission(async (req, auth) => {
  const body = await req.json();
  const { phone, name, email, tags, segments, custom_fields } = body;

  if (!phone) {
    return errorResponse('phone is required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.upsertContact(auth.clientId!, { phone, name, email, tags, segments, custom_fields });

  if (!result.success) {
    return errorResponse(result.error || 'Failed to upsert contact', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'contact.upsert',
    resource_type: 'whatsapp_contact',
    resource_id: result.data?.id,
    details: { phone, name },
  });

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_CONTACTS);

import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const PUT = withPermission(async (req, auth) => {
  const url = new URL(req.url);
  const contactId = url.pathname.split('/').pop();

  if (!contactId) {
    return errorResponse('Contact ID required', 400);
  }

  const body = await req.json();
  const service = getWhatsAppService();
  const result = await service.updateContact(auth.clientId!, contactId, body);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to update contact', 500);
  }

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_CONTACTS);

export const DELETE = withPermission(async (req, auth) => {
  const url = new URL(req.url);
  const contactId = url.pathname.split('/').pop();

  if (!contactId) {
    return errorResponse('Contact ID required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.deleteContact(auth.clientId!, contactId);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to delete contact', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'contact.delete',
    resource_type: 'whatsapp_contact',
    resource_id: contactId,
  });

  return successResponse({ deleted: true });
}, PERMISSIONS.WHATSAPP_CONTACTS);

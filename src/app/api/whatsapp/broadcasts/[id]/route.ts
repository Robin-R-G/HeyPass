import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const POST = withPermission(async (req, auth) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const broadcastId = pathParts[pathParts.length - 2];

  if (!broadcastId) {
    return errorResponse('Broadcast ID required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.sendBroadcast(auth.clientId!, broadcastId);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to send broadcast', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'broadcast.send',
    resource_type: 'whatsapp_broadcast',
    resource_id: broadcastId,
  });

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_BROADCAST);

export const DELETE = withPermission(async (req, auth) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const broadcastId = pathParts[pathParts.length - 2];

  if (!broadcastId) {
    return errorResponse('Broadcast ID required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.deleteBroadcast(auth.clientId!, broadcastId);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to delete broadcast', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'broadcast.cancel',
    resource_type: 'whatsapp_broadcast',
    resource_id: broadcastId,
  });

  return successResponse({ deleted: true });
}, PERMISSIONS.WHATSAPP_BROADCAST);

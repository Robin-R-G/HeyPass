import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  const service = getWhatsAppService();
  const result = await service.getTemplates(auth.clientId!);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get templates', 500);
  }

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_TEMPLATES);

export const POST = withPermission(async (req, auth) => {
  const service = getWhatsAppService();
  const result = await service.syncTemplates(auth.clientId!);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to sync templates', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'template.sync',
    details: { count: Array.isArray(result.data) ? result.data.length : 0 },
  });

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_TEMPLATES);

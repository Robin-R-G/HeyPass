import { NextRequest } from 'next/server';
import { withPermission, withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { sanitizeConfig } from '@/lib/whatsapp/sanitize';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  const service = getWhatsAppService();
  const result = await service.getConfig(auth.clientId!);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get config', 500);
  }

  return successResponse(sanitizeConfig(result.data));
}, PERMISSIONS.WHATSAPP_VIEW);

export const POST = withPermission(async (req, auth) => {
  const body = await req.json();
  const service = getWhatsAppService();
  const result = await service.saveConfig(auth.clientId!, body);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to save config', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'config.save',
    resource_type: 'whatsapp_config',
    resource_id: result.data?.id,
    details: { business_name: body.business_name },
  });

  return successResponse(sanitizeConfig(result.data));
}, PERMISSIONS.WHATSAPP_MANAGE);

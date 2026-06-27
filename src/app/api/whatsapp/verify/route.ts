import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const POST = withPermission(async (req, auth) => {
  const service = getWhatsAppService();
  const result = await service.verifyConnection(auth.clientId!);

  if (!result.success) {
    await createWhatsAppAuditLog({
      client_id: auth.clientId!,
      user_id: auth.userId,
      action: 'config.verify',
      details: { status: 'failed', error: result.error },
    });
    return errorResponse(result.error || 'Connection failed', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'config.verify',
    details: { status: 'connected' },
  });

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_MANAGE);

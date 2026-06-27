import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const POST = withPermission(async (req, auth) => {
  const body = await req.json();
  const { to, template, variables } = body;

  if (!to || !template) {
    return errorResponse('to and template are required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.sendMessage(auth.clientId!, to, template, variables);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to send message', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'message.send',
    resource_type: 'whatsapp_message',
    details: { to, template },
  });

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_SEND);

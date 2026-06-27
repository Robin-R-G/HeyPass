import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { createWhatsAppAuditLog } from '@/lib/whatsapp/audit';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  const service = getWhatsAppService();
  const result = await service.getBroadcasts(auth.clientId!);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get broadcasts', 500);
  }

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_BROADCAST);

export const POST = withPermission(async (req, auth) => {
  const body = await req.json();
  const { name, template_id, target_type, target_filter, contact_ids, message_text, template_variables, scheduled_at } = body;

  if (!name || !template_id) {
    return errorResponse('name and template_id are required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.createBroadcast(auth.clientId!, {
    name,
    template_id,
    target_type: target_type || 'all',
    target_filter,
    contact_ids,
    message_text,
    template_variables,
    scheduled_at,
  });

  if (!result.success) {
    return errorResponse(result.error || 'Failed to create broadcast', 500);
  }

  await createWhatsAppAuditLog({
    client_id: auth.clientId!,
    user_id: auth.userId,
    action: 'broadcast.create',
    resource_type: 'whatsapp_broadcast',
    resource_id: result.data?.id,
    details: { name, scheduled_at },
  });

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_BROADCAST);

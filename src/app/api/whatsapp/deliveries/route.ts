import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  const url = new URL(req.url);
  const broadcastId = url.searchParams.get('broadcast_id');

  if (!broadcastId) {
    return errorResponse('broadcast_id is required', 400);
  }

  const service = getWhatsAppService();
  const result = await service.getBroadcastDeliveries(broadcastId, auth.clientId!);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get deliveries', 500);
  }

  return successResponse(result.data);
}, PERMISSIONS.WHATSAPP_VIEW);

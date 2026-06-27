import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { getWhatsAppService } from '@/lib/whatsapp/whatsapp-service';

export const GET = withAuth(async (req, auth) => {
  if (!auth.is_superadmin) {
    return errorResponse('Unauthorized', 403);
  }

  const service = getWhatsAppService();
  const result = await service.getAllConfigs();

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get configs', 500);
  }

  return successResponse(result.data);
});

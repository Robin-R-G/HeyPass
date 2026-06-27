import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIConfigService } from '@/lib/ai/ai-config-service';
import { PERMISSIONS } from '@/lib/permissions';
import { aiToggleSchema } from '@/lib/validators';
import { createAIAuditLog } from '@/lib/ai/ai-audit';

export const POST = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const body = await req.json();
  const validation = aiToggleSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse(validation.error.errors[0].message, 400);
  }

  const service = getAIConfigService();
  const result = await service.toggleEnabled(auth.clientId, validation.data.is_enabled);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to toggle AI', 500);
  }

  await createAIAuditLog({
    client_id: auth.clientId,
    user_id: auth.userId,
    action: 'config.toggle',
    resource_type: 'ai_configuration',
    details: { is_enabled: validation.data.is_enabled },
  });

  return successResponse(result.data);
}, PERMISSIONS.AI_CONFIGURE);

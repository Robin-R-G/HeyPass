import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIConfigService, type AIConfigInput } from '@/lib/ai/ai-config-service';
import { PERMISSIONS } from '@/lib/permissions';
import { createAIAuditLog } from '@/lib/ai/ai-audit';
import { aiConfigSchema } from '@/lib/validators';

export const GET = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const service = getAIConfigService();
  const result = await service.getConfig(auth.clientId);

  if (!result.success) {
    return errorResponse(result.error || 'Configuration not found', 404);
  }

  return successResponse(result.data);
}, PERMISSIONS.AI_VIEW);

export const POST = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const body = await req.json();
  const validation = aiConfigSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse(validation.error.errors[0].message, 400);
  }

  const service = getAIConfigService();
  const result = await service.saveConfig(auth.clientId, validation.data as AIConfigInput, auth.userId);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to save configuration', 500);
  }

  await createAIAuditLog({
    client_id: auth.clientId,
    user_id: auth.userId,
    action: 'config.save',
    resource_type: 'ai_configuration',
    resource_id: result.data?.id,
    details: { provider: validation.data.provider, model: validation.data.default_model },
  });

  return successResponse(result.data);
}, PERMISSIONS.AI_CONFIGURE);

export const DELETE = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const service = getAIConfigService();
  const result = await service.deleteConfig(auth.clientId, auth.userId);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to delete configuration', 500);
  }

  await createAIAuditLog({
    client_id: auth.clientId,
    user_id: auth.userId,
    action: 'config.delete',
    resource_type: 'ai_configuration',
    details: { deleted: true },
  });

  return successResponse({ deleted: true });
}, PERMISSIONS.AI_MANAGE);

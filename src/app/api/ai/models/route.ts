import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIConfigService } from '@/lib/ai/ai-config-service';
import { getProvider } from '@/lib/ai/provider-registry';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const service = getAIConfigService();
  const config = await service.getDecryptedConfig(auth.clientId);

  if (!config) {
    return errorResponse('AI not configured or not enabled', 404);
  }

  try {
    const provider = getProvider(config.provider);
    const models = await provider.listModels(config.api_key);
    return successResponse({ models, provider: config.provider });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to list models', 500);
  }
}, PERMISSIONS.AI_VIEW);

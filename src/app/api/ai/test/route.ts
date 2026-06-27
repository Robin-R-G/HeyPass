import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIConfigService } from '@/lib/ai/ai-config-service';
import { PERMISSIONS } from '@/lib/permissions';
import { createAIAuditLog } from '@/lib/ai/ai-audit';

export const POST = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const service = getAIConfigService();
  const result = await service.testConnection(auth.clientId);

  await createAIAuditLog({
    client_id: auth.clientId,
    user_id: auth.userId,
    action: 'connection.test',
    resource_type: 'ai_configuration',
    details: { success: result.success, latency_ms: result.latencyMs },
  });

  if (!result.success) {
    return successResponse({ connected: false, error: result.error, latency_ms: result.latencyMs });
  }

  return successResponse({ connected: true, latency_ms: result.latencyMs });
}, PERMISSIONS.AI_CONFIGURE);

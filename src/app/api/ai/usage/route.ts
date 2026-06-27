import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIUsageService } from '@/lib/ai/ai-usage-service';
import { PERMISSIONS } from '@/lib/permissions';

export const GET = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const view = url.searchParams.get('view'); // 'stats' or 'history'

  const service = getAIUsageService();

  if (view === 'stats') {
    const stats = await service.getUsageStats(auth.clientId);
    return successResponse(stats);
  }

  const history = await service.getUsageHistory(auth.clientId, page, limit);
  return successResponse(history);
}, PERMISSIONS.AI_VIEW_USAGE);

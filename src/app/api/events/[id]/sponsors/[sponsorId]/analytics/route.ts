import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { sponsorAnalyticsService } from '@/lib/sponsor-analytics-service';

export async function GET(req: NextRequest, { params }: { params: { id: string; sponsorId: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const analytics = await sponsorAnalyticsService.getSponsorAnalytics(auth.clientId, params.id, params.sponsorId);
    return successResponse({ analytics });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

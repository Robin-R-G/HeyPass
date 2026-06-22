import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { getFormAnalytics, getFormAnalyticsDaily } from '@/lib/form-analytics';

// GET /api/forms/[id]/analytics — Get form analytics
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (startDate && endDate) {
      const data = await getFormAnalyticsDaily(
        id,
        auth.clientId,
        startDate,
        endDate
      );
      return successResponse({ analytics: data });
    }

    const summary = await getFormAnalytics(id, auth.clientId, days);
    return successResponse({ analytics: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

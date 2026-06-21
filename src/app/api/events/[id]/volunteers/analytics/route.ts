import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { volunteerService } from '@/lib/volunteer-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const analytics = await volunteerService.getVolunteerAnalytics(auth.clientId, params.id);
    return successResponse({ analytics });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

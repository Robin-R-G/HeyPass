import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { emergencyService } from '@/lib/emergency-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const stats = await emergencyService.getEmergencyStats(auth.clientId, params.id);
    return successResponse({ stats });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

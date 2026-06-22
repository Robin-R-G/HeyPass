import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { volunteerService } from '@/lib/volunteer-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;

    const schedule = await volunteerService.getSchedule(auth.clientId, id, date);
    return successResponse({ schedule });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

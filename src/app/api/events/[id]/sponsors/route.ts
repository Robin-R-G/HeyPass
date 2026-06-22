import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { sponsorAnalyticsService } from '@/lib/sponsor-analytics-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const sponsors = await sponsorAnalyticsService.getSponsors(auth.clientId, id);
    return successResponse({ sponsors });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name } = body;
    if (!name) return errorResponse('name is required');

    const sponsor = await sponsorAnalyticsService.createSponsor(auth.clientId, id, body);
    return successResponse({ sponsor }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

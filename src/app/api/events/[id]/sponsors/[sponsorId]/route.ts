import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { sponsorAnalyticsService } from '@/lib/sponsor-analytics-service';

export async function GET(req: NextRequest, { params }: { params: { id: string; sponsorId: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const sponsor = await sponsorAnalyticsService.getSponsorById(auth.clientId, params.sponsorId);
    return successResponse({ sponsor });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; sponsorId: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const sponsor = await sponsorAnalyticsService.updateSponsor(auth.clientId, params.sponsorId, body);
    return successResponse({ sponsor });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; sponsorId: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_DELETE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    await sponsorAnalyticsService.deleteSponsor(auth.clientId, params.sponsorId);
    return successResponse({ deleted: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

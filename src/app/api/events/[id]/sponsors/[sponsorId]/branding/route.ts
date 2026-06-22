import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { sponsorAnalyticsService } from '@/lib/sponsor-analytics-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; sponsorId: string }> }) {
  try {
    const { id, sponsorId } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const branding = await sponsorAnalyticsService.getSponsorBranding(auth.clientId, id, sponsorId);
    return successResponse({ branding });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; sponsorId: string }> }) {
  try {
    const { id, sponsorId } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { placement_type } = body;
    if (!placement_type) return errorResponse('placement_type is required');

    const branding = await sponsorAnalyticsService.createSponsorBranding(
      auth.clientId, id, sponsorId, body
    );
    return successResponse({ branding }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

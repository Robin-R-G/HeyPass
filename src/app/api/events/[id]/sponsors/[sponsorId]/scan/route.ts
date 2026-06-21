import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { sponsorAnalyticsService } from '@/lib/sponsor-analytics-service';

export async function POST(req: NextRequest, { params }: { params: { id: string; sponsorId: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { branding_id, scan_type, registration_id, device_info } = body;
    if (!branding_id || !scan_type) return errorResponse('branding_id and scan_type are required');

    const scan = await sponsorAnalyticsService.recordSponsorScan(
      auth.clientId,
      params.id,
      params.sponsorId,
      branding_id,
      registration_id || null,
      scan_type,
      device_info
    );
    return successResponse({ scan }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

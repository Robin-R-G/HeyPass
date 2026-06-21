import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { emergencyService } from '@/lib/emergency-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;

    const items = await emergencyService.getLostFoundItems(auth.clientId, params.id, status);
    return successResponse({ items });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENT_MANAGE_STAFF);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    if (!body.item_description) {
      return errorResponse('item_description is required');
    }

    const item = await emergencyService.createLostFoundItem(auth.clientId, params.id, {
      item_description: body.item_description,
      category: body.category,
      found_location: body.found_location,
      found_at: body.found_at,
      reported_by_name: body.reported_by_name,
      reported_by_phone: body.reported_by_phone,
      photo_url: body.photo_url,
    });
    return successResponse({ item }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

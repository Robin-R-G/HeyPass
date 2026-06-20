import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { reorderFields } from '@/lib/form-builder';

// PUT /api/forms/[id]/reorder — Reorder fields and sections
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const { requirePermission } = await import('@/lib/permissions');

    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) {
      return errorResponse('Forbidden', 403);
    }

    const body = await req.json();
    const { field_orders } = body;

    if (!Array.isArray(field_orders)) {
      return errorResponse('field_orders must be an array');
    }

    await reorderFields(params.id, auth.clientId, auth.userId, field_orders);
    return successResponse({ reordered: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

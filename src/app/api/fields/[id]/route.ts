import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { updateField, deleteField } from '@/lib/form-builder';

// PUT /api/fields/[id] — Update field
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const field = await updateField(id, auth.clientId, auth.userId, body);

    return successResponse({ field });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

// DELETE /api/fields/[id] — Delete field
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    await deleteField(id, auth.clientId, auth.userId);
    return successResponse({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { updateSection, deleteSection } from '@/lib/form-builder';

// PUT /api/sections/[id] — Update section
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
    const section = await updateSection(id, auth.clientId, auth.userId, {
      title: body.title,
      description: body.description,
      sort_order: body.sort_order,
      is_collapsible: body.is_collapsible,
      is_collapsed_default: body.is_collapsed_default,
    });

    return successResponse({ section });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

// DELETE /api/sections/[id] — Delete section
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

    await deleteSection(id, auth.clientId, auth.userId);
    return successResponse({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

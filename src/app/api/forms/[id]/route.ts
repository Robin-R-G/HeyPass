import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { getForm, updateForm, deleteForm } from '@/lib/form-builder';

// GET /api/forms/[id] — Get form with fields and sections
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const form = await getForm(params.id, auth.clientId);
    if (!form) {
      return errorResponse('Form not found', 404);
    }

    return successResponse({ form });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

// PUT /api/forms/[id] — Update form
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
    const form = await updateForm(params.id, auth.clientId, auth.userId, {
      name: body.name,
      is_active: body.is_active,
      is_multi_step: body.is_multi_step,
      steps_config: body.steps_config,
    });

    return successResponse({ form });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

// DELETE /api/forms/[id] — Delete form
export async function DELETE(
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

    const guard = await requirePermission(req, PERMISSIONS.EVENTS_DELETE);
    if (!guard.allowed) {
      return errorResponse('Forbidden', 403);
    }

    await deleteForm(params.id, auth.clientId, auth.userId);
    return successResponse({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { listForms, createForm } from '@/lib/form-builder';

// GET /api/events/[id]/forms — List forms for event
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

    const forms = await listForms(params.id, auth.clientId);
    return successResponse({ forms });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

// POST /api/events/[id]/forms — Create form
export async function POST(
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
    const form = await createForm(params.id, auth.clientId, auth.userId, {
      name: body.name,
      is_active: body.is_active,
      is_multi_step: body.is_multi_step,
    });

    return successResponse({ form }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

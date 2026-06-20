import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { createFormFromTemplate } from '@/lib/form-templates';

// POST /api/forms/[id]/from-template — Create form from template
// Note: [id] here is actually the event_id
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
    const { template_id, form_name } = body;

    if (!template_id) {
      return errorResponse('template_id is required');
    }

    const formId = await createFormFromTemplate(
      template_id,
      params.id,
      auth.clientId,
      auth.userId,
      form_name
    );

    return successResponse({ form_id: formId }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

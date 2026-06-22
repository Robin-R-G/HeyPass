import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { addSection } from '@/lib/form-builder';

// POST /api/forms/[id]/sections — Add section to form
export async function POST(
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
    const section = await addSection(id, auth.clientId, auth.userId, {
      title: body.title,
      description: body.description,
      sort_order: body.sort_order,
    });

    return successResponse({ section }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

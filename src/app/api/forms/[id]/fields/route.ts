import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { addField } from '@/lib/form-builder';

// POST /api/forms/[id]/fields — Add field to form
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
    const field = await addField(id, auth.clientId, auth.userId, {
      label: body.label,
      field_type: body.field_type,
      placeholder: body.placeholder,
      is_required: body.is_required,
      is_unique: body.is_unique,
      is_readonly: body.is_readonly,
      sort_order: body.sort_order,
      options: body.options,
      validation: body.validation,
      conditional_logic: body.conditional_logic,
      conditional_required: body.conditional_required,
      default_value: body.default_value,
      help_text: body.help_text,
      section_id: body.section_id,
    });

    return successResponse({ field }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

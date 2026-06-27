import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIPromptService } from '@/lib/ai/ai-prompt-service';
import { PERMISSIONS } from '@/lib/permissions';
import { aiPromptTemplateSchema } from '@/lib/validators';
import { createAIAuditLog } from '@/lib/ai/ai-audit';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHandler = withPermission(async (req: NextRequest, auth) => {
    if (!auth.clientId) return errorResponse('No client context', 403);

    const body = await req.json();
    const validation = aiPromptTemplateSchema.partial().safeParse(body);

    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }

    const service = getAIPromptService();
    const result = await service.updateTemplate(auth.clientId, id, validation.data);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to update template', 500);
    }

    await createAIAuditLog({
      client_id: auth.clientId,
      user_id: auth.userId,
      action: 'prompt.update',
      resource_type: 'ai_prompt_template',
      resource_id: id,
      details: validation.data,
    });

    return successResponse(result.data);
  }, PERMISSIONS.AI_CONFIGURE);

  return authHandler(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHandler = withPermission(async (req: NextRequest, auth) => {
    if (!auth.clientId) return errorResponse('No client context', 403);

    const service = getAIPromptService();
    const result = await service.deleteTemplate(auth.clientId, id);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to delete template', 500);
    }

    await createAIAuditLog({
      client_id: auth.clientId,
      user_id: auth.userId,
      action: 'prompt.delete',
      resource_type: 'ai_prompt_template',
      resource_id: id,
      details: { deleted: true },
    });

    return successResponse({ deleted: true });
  }, PERMISSIONS.AI_MANAGE);

  return authHandler(req);
}

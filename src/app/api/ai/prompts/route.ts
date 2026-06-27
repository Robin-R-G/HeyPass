import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIPromptService } from '@/lib/ai/ai-prompt-service';
import { PERMISSIONS } from '@/lib/permissions';
import { aiPromptTemplateSchema } from '@/lib/validators';
import { createAIAuditLog } from '@/lib/ai/ai-audit';

export const GET = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const service = getAIPromptService();
  const result = await service.getTemplates(auth.clientId);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to get templates', 500);
  }

  return successResponse(result.data);
}, PERMISSIONS.AI_USE);

export const POST = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const body = await req.json();
  const validation = aiPromptTemplateSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse(validation.error.errors[0].message, 400);
  }

  const service = getAIPromptService();
  const result = await service.createTemplate(auth.clientId, validation.data);

  if (!result.success) {
    return errorResponse(result.error || 'Failed to create template', 500);
  }

  await createAIAuditLog({
    client_id: auth.clientId,
    user_id: auth.userId,
    action: 'prompt.create',
    resource_type: 'ai_prompt_template',
    resource_id: result.data?.id,
    details: { name: validation.data.name, slug: validation.data.slug },
  });

  return successResponse(result.data);
}, PERMISSIONS.AI_CONFIGURE);

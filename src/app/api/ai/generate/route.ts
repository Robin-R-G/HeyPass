import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { getAIConfigService } from '@/lib/ai/ai-config-service';
import { getAIUsageService } from '@/lib/ai/ai-usage-service';
import { getAIPromptService } from '@/lib/ai/ai-prompt-service';
import { getProvider } from '@/lib/ai/provider-registry';
import { PERMISSIONS } from '@/lib/permissions';
import { aiGenerateSchema } from '@/lib/validators';

export const POST = withPermission(async (req, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const body = await req.json();
  const validation = aiGenerateSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse(validation.error.errors[0].message, 400);
  }

  const configService = getAIConfigService();
  const config = await configService.getDecryptedConfig(auth.clientId);

  if (!config) {
    return errorResponse('AI is not configured. Please configure an AI provider in Settings.', 400);
  }

  const promptService = getAIPromptService();
  let promptText = validation.data.prompt_override;

  if (!promptText) {
    const templateResult = await promptService.getTemplate(auth.clientId, validation.data.feature);
    if (templateResult.success && templateResult.data) {
      promptText = promptService.renderTemplate(templateResult.data.template, validation.data.variables);
    } else {
      promptText = `Generate content for ${validation.data.feature} with the following details:\n${Object.entries(validation.data.variables).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
    }
  }

  const provider = getProvider(config.provider);
  const start = Date.now();

  try {
    const result = await provider.complete({
      apiKey: config.apiKey,
      model: config.model,
      messages: [{ role: 'user', content: promptText }],
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt: config.systemPrompt,
    });

    const usageService = getAIUsageService();
    await usageService.logRequest({
      client_id: auth.clientId,
      user_id: auth.userId,
      provider: config.provider,
      model: config.model,
      feature: validation.data.feature,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      total_tokens: result.totalTokens,
      latency_ms: result.latencyMs,
      status: 'success',
    });

    return successResponse({
      content: result.content,
      model: result.model,
      tokens: result.totalTokens,
      latency_ms: result.latencyMs,
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : 'AI generation failed';

    const usageService = getAIUsageService();
    await usageService.logRequest({
      client_id: auth.clientId,
      user_id: auth.userId,
      provider: config.provider,
      model: config.model,
      feature: validation.data.feature,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: latencyMs,
      status: 'error',
      error_message: errorMsg,
    });

    return errorResponse(errorMsg, 500);
  }
}, PERMISSIONS.AI_USE);

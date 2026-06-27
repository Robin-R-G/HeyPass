import type { AIProviderAdapter, AICompletionRequest, AICompletionResponse, AITestResult, AIModelInfo, AIProviderInfo } from '../provider-interface';

const OPENAI_MODELS: AIModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', context_window: 128000, max_output: 16384, supports_vision: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_window: 128000, max_output: 16384, supports_vision: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context_window: 128000, max_output: 4096, supports_vision: true },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context_window: 16385, max_output: 4096 },
];

export class OpenAIAdapter implements AIProviderAdapter {
  name = 'openai';
  displayName = 'OpenAI';

  validateKeyFormat(apiKey: string): boolean {
    return /^sk-[a-zA-Z0-9]{48,}$/.test(apiKey) || /^sk-proj-[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "connection successful" in exactly two words.' }],
          max_tokens: 10,
          temperature: 0,
        }),
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        if (res.status === 401) return { success: false, error: 'Invalid API key' };
        if (res.status === 429) return { success: false, error: 'Rate limited. Try again later.' };
        return { success: false, error: msg };
      }

      return { success: true, model, latencyMs };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  async listModels(): Promise<AIModelInfo[]> {
    return OPENAI_MODELS;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push(...request.messages);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      latencyMs,
      model: data.model || request.model,
    };
  }

  getProviderInfo(): AIProviderInfo {
    return {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models from OpenAI including GPT-4o and GPT-3.5 Turbo',
      models: OPENAI_MODELS,
      requires_api_key: true,
    };
  }
}

import type { AIProviderAdapter, AICompletionRequest, AICompletionResponse, AITestResult, AIModelInfo, AIProviderInfo } from '../provider-interface';

const OPENROUTER_MODELS: AIModelInfo[] = [
  { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', context_window: 128000, max_output: 16384, supports_vision: true },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (via OpenRouter)', context_window: 128000, max_output: 16384 },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context_window: 200000, max_output: 8192, supports_vision: true },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', context_window: 128000, max_output: 32768 },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', context_window: 2000000, max_output: 8192, supports_vision: true },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', context_window: 32768, max_output: 32768 },
];

export class OpenRouterAdapter implements AIProviderAdapter {
  name = 'openrouter';
  displayName = 'OpenRouter';

  validateKeyFormat(apiKey: string): boolean {
    return /^sk-or-[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://heypass.io',
          'X-Title': 'HeyPass',
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
    return OPENROUTER_MODELS;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push(...request.messages);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://heypass.io',
        'X-Title': 'HeyPass',
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
      throw new Error(err?.error?.message || `OpenRouter API error: ${res.status}`);
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
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Access multiple AI providers through a single API with OpenRouter',
      models: OPENROUTER_MODELS,
      requires_api_key: true,
    };
  }
}

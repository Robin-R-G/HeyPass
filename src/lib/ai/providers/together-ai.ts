import type { AIProviderAdapter, AICompletionRequest, AICompletionResponse, AITestResult, AIModelInfo, AIProviderInfo } from '../provider-interface';

const TOGETHER_MODELS: AIModelInfo[] = [
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', context_window: 128000, max_output: 16384 },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo', context_window: 128000, max_output: 8192 },
  { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', context_window: 65536, max_output: 65536 },
  { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo', context_window: 32768, max_output: 8192 },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', context_window: 65536, max_output: 8192 },
];

export class TogetherAIAdapter implements AIProviderAdapter {
  name = 'together_ai';
  displayName = 'Together AI';

  validateKeyFormat(apiKey: string): boolean {
    return /^[a-f0-9]{64,}$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.together.xyz/v1/chat/completions', {
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
    return TOGETHER_MODELS;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push(...request.messages);

    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
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
      throw new Error(err?.error?.message || `Together AI API error: ${res.status}`);
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
      id: 'together_ai',
      name: 'Together AI',
      description: 'Open-source models with fast inference on Together AI',
      models: TOGETHER_MODELS,
      requires_api_key: true,
    };
  }
}

import type { AIProviderAdapter, AICompletionRequest, AICompletionResponse, AITestResult, AIModelInfo, AIProviderInfo } from '../provider-interface';

const GROQ_MODELS: AIModelInfo[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', context_window: 128000, max_output: 32768 },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', context_window: 128000, max_output: 8192 },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', context_window: 32768, max_output: 32768 },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', context_window: 8192, max_output: 8192 },
];

export class GroqAdapter implements AIProviderAdapter {
  name = 'groq';
  displayName = 'Groq';

  validateKeyFormat(apiKey: string): boolean {
    return /^gsk_[a-zA-Z0-9]{52,}$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    return GROQ_MODELS;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push(...request.messages);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      throw new Error(err?.error?.message || `Groq API error: ${res.status}`);
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
      id: 'groq',
      name: 'Groq',
      description: 'Ultra-fast inference with Groq LPU for Llama and Mixtral models',
      models: GROQ_MODELS,
      requires_api_key: true,
    };
  }
}

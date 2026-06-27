import type { AIProviderAdapter, AICompletionRequest, AICompletionResponse, AITestResult, AIModelInfo, AIProviderInfo } from '../provider-interface';

// ============================================================
// FUTURE PROVIDERS - Stub Adapters
// Each follows the same interface; ready for activation
// ============================================================

// --- xAI (Grok) ---
const XAI_MODELS: AIModelInfo[] = [
  { id: 'grok-2', name: 'Grok 2', context_window: 131072, max_output: 4096, supports_vision: true },
  { id: 'grok-2-mini', name: 'Grok 2 Mini', context_window: 131072, max_output: 4096 },
];

export class XAIAdapter implements AIProviderAdapter {
  name = 'xai';
  displayName = 'xAI (Grok)';
  private baseUrl = 'https://api.x.ai/v1';

  validateKeyFormat(apiKey: string): boolean {
    return /^xai-[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say "connection successful" in exactly two words.' }], max_tokens: 10, temperature: 0 }),
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

  async listModels(): Promise<AIModelInfo[]> { return XAI_MODELS; }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
    messages.push(...request.messages);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${request.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model, messages, temperature: request.temperature ?? 0.7, max_tokens: request.maxTokens ?? 2048 }),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `xAI API error: ${res.status}`); }
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content || '', promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0, latencyMs, model: data.model || request.model };
  }

  getProviderInfo(): AIProviderInfo {
    return { id: 'xai', name: 'xAI (Grok)', description: 'Grok models from xAI', models: XAI_MODELS, requires_api_key: true };
  }
}

// --- Anthropic Claude ---
const ANTHROPIC_MODELS: AIModelInfo[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', context_window: 200000, max_output: 8192, supports_vision: true },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', context_window: 200000, max_output: 8192, supports_vision: true },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context_window: 200000, max_output: 4096, supports_vision: true },
];

export class AnthropicAdapter implements AIProviderAdapter {
  name = 'anthropic';
  displayName = 'Anthropic Claude';
  private baseUrl = 'https://api.anthropic.com/v1';

  validateKeyFormat(apiKey: string): boolean {
    return /^sk-ant-[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: 'Say "connection successful" in exactly two words.' }] }),
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

  async listModels(): Promise<AIModelInfo[]> { return ANTHROPIC_MODELS; }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'x-api-key': request.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model, max_tokens: request.maxTokens ?? 2048, system: request.systemPrompt, messages: request.messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content })) }),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `Anthropic API error: ${res.status}`); }
    const data = await res.json();
    return { content: data.content?.[0]?.text || '', promptTokens: data.usage?.input_tokens || 0, completionTokens: data.usage?.output_tokens || 0, totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0), latencyMs, model: data.model || request.model };
  }

  getProviderInfo(): AIProviderInfo {
    return { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude models from Anthropic', models: ANTHROPIC_MODELS, requires_api_key: true };
  }
}

// --- Google Gemini ---
const GOOGLE_MODELS: AIModelInfo[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context_window: 1048576, max_output: 8192, supports_vision: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context_window: 2097152, max_output: 8192, supports_vision: true },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context_window: 1048576, max_output: 8192, supports_vision: true },
];

export class GoogleAdapter implements AIProviderAdapter {
  name = 'google';
  displayName = 'Google Gemini';

  validateKeyFormat(apiKey: string): boolean {
    return /^AIza[a-zA-Z0-9_-]{35}$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Say "connection successful" in exactly two words.' }] }], generationConfig: { maxOutputTokens: 10, temperature: 0 } }),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        if (res.status === 400 || res.status === 403) return { success: false, error: 'Invalid API key' };
        return { success: false, error: msg };
      }
      return { success: true, model, latencyMs };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  async listModels(): Promise<AIModelInfo[]> { return GOOGLE_MODELS; }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const contents = [];
    if (request.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: request.systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }
    for (const msg of request.messages) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${request.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: request.maxTokens ?? 2048, temperature: request.temperature ?? 0.7 } }),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `Google AI error: ${res.status}`); }
    const data = await res.json();
    return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || '', promptTokens: data.usageMetadata?.promptTokenCount || 0, completionTokens: data.usageMetadata?.candidatesTokenCount || 0, totalTokens: data.usageMetadata?.totalTokenCount || 0, latencyMs, model: request.model };
  }

  getProviderInfo(): AIProviderInfo {
    return { id: 'google', name: 'Google Gemini', description: 'Gemini models from Google AI', models: GOOGLE_MODELS, requires_api_key: true };
  }
}

// --- DeepSeek ---
const DEEPSEEK_MODELS: AIModelInfo[] = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', context_window: 65536, max_output: 8192 },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', context_window: 65536, max_output: 8192 },
];

export class DeepSeekAdapter implements AIProviderAdapter {
  name = 'deepseek';
  displayName = 'DeepSeek';
  private baseUrl = 'https://api.deepseek.com';

  validateKeyFormat(apiKey: string): boolean {
    return /^sk-[a-f0-9]{32,}$/.test(apiKey);
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say "connection successful" in exactly two words.' }], max_tokens: 10, temperature: 0 }),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) { const err = await res.json().catch(() => ({})); const msg = err?.error?.message || `HTTP ${res.status}`; if (res.status === 401) return { success: false, error: 'Invalid API key' }; return { success: false, error: msg }; }
      return { success: true, model, latencyMs };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Network error' }; }
  }

  async listModels(): Promise<AIModelInfo[]> { return DEEPSEEK_MODELS; }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
    messages.push(...request.messages);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${request.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model, messages, temperature: request.temperature ?? 0.7, max_tokens: request.maxTokens ?? 2048 }),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `DeepSeek API error: ${res.status}`); }
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content || '', promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0, latencyMs, model: data.model || request.model };
  }

  getProviderInfo(): AIProviderInfo {
    return { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat and Reasoner models', models: DEEPSEEK_MODELS, requires_api_key: true };
  }
}

// --- Ollama (Self-hosted) ---
const OLLAMA_MODELS: AIModelInfo[] = [
  { id: 'llama3.3:latest', name: 'Llama 3.3 (Latest)', context_window: 128000, max_output: 8192 },
  { id: 'mistral:latest', name: 'Mistral (Latest)', context_window: 32768, max_output: 8192 },
  { id: 'codellama:latest', name: 'Code Llama', context_window: 16384, max_output: 4096 },
];

export class OllamaAdapter implements AIProviderAdapter {
  name = 'ollama';
  displayName = 'Ollama (Self-hosted)';

  validateKeyFormat(): boolean {
    return true; // Ollama doesn't require an API key
  }

  async testConnection(apiKey: string, model: string): Promise<AITestResult> {
    const baseUrl = apiKey || 'http://localhost:11434';
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say "connection successful" in exactly two words.' }], stream: false, options: { num_predict: 10, temperature: 0 } }),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) { const msg = `HTTP ${res.status}`; return { success: false, error: msg }; }
      return { success: true, model, latencyMs };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Connection failed. Ensure Ollama is running.' }; }
  }

  async listModels(): Promise<AIModelInfo[]> { return OLLAMA_MODELS; }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const baseUrl = request.apiKey || 'http://localhost:11434';
    const start = Date.now();
    const messages = [];
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
    messages.push(...request.messages);
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model, messages, stream: false, options: { num_predict: request.maxTokens ?? 2048, temperature: request.temperature ?? 0.7 } }),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { throw new Error(`Ollama API error: ${res.status}`); }
    const data = await res.json();
    return { content: data.message?.content || '', promptTokens: data.prompt_eval_count || 0, completionTokens: data.eval_count || 0, totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0), latencyMs, model: data.model || request.model };
  }

  getProviderInfo(): AIProviderInfo {
    return { id: 'ollama', name: 'Ollama (Self-hosted)', description: 'Self-hosted models via Ollama', models: OLLAMA_MODELS, requires_api_key: false, base_url: 'http://localhost:11434' };
  }
}

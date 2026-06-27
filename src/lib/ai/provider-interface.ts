export interface AIProviderAdapter {
  name: string;
  displayName: string;

  validateKeyFormat(apiKey: string): boolean;
  testConnection(apiKey: string, model: string): Promise<AITestResult>;
  listModels(apiKey: string): Promise<AIModelInfo[]>;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  getProviderInfo(): AIProviderInfo;
}

export interface AICompletionRequest {
  apiKey: string;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
}

export interface AITestResult {
  success: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface AIModelInfo {
  id: string;
  name: string;
  context_window: number;
  max_output: number;
  supports_vision?: boolean;
}

export interface AIProviderInfo {
  id: string;
  name: string;
  description: string;
  models: AIModelInfo[];
  requires_api_key: boolean;
  base_url?: string;
}

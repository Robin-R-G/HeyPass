import type { AIProviderAdapter, AIProviderInfo, AIModelInfo, AICompletionRequest, AICompletionResponse, AITestResult } from './provider-interface';
import { OpenAIAdapter } from './providers/openai';
import { GroqAdapter } from './providers/groq';
import { OpenRouterAdapter } from './providers/openrouter';
import { TogetherAIAdapter } from './providers/together-ai';
import { XAIAdapter, AnthropicAdapter, GoogleAdapter, DeepSeekAdapter, OllamaAdapter } from './providers/future-providers';

export type { AIProviderAdapter, AIProviderInfo, AIModelInfo, AICompletionRequest, AICompletionResponse, AITestResult };

const adapters: Record<string, AIProviderAdapter> = {
  openai: new OpenAIAdapter(),
  groq: new GroqAdapter(),
  openrouter: new OpenRouterAdapter(),
  together_ai: new TogetherAIAdapter(),
  xai: new XAIAdapter(),
  anthropic: new AnthropicAdapter(),
  google: new GoogleAdapter(),
  deepseek: new DeepSeekAdapter(),
  ollama: new OllamaAdapter(),
};

export function getProvider(provider: string): AIProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown AI provider: ${provider}`);
  return adapter;
}

export function getAllProviders(): AIProviderInfo[] {
  return Object.values(adapters).map(a => a.getProviderInfo());
}

export function getProviderByName(name: string): AIProviderAdapter | undefined {
  return adapters[name];
}

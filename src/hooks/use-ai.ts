'use client';

import { useState, useEffect, useCallback } from 'react';

interface AIConfig {
  provider: string;
  model: string;
  is_enabled: boolean;
  connection_status: string;
}

interface GenerateResult {
  content: string;
  model: string;
  tokens: number;
  latency_ms: number;
}

export function useAI() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/config')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setConfig({
            provider: data.data.provider,
            model: data.data.default_model,
            is_enabled: data.data.is_enabled,
            connection_status: data.data.connection_status,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isConfigured = !!config?.is_enabled && config?.connection_status === 'connected';

  return { config, isConfigured, loading };
}

export function useAIGenerate() {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (feature: string, variables: Record<string, string>, promptOverride?: string) => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, variables, prompt_override: promptOverride }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return null;
      }

      setResult(data.data);
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, generating, result, error, reset };
}

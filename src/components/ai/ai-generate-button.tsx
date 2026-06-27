'use client';

import { useState } from 'react';
import { useAI, useAIGenerate } from '@/hooks/use-ai';
import { Loader2, Brain, Copy, Check, X, RefreshCw } from 'lucide-react';

interface AIGenerateButtonProps {
  feature: string;
  variables: Record<string, string>;
  label?: string;
  className?: string;
  onGenerated?: (content: string) => void;
}

export function AIGenerateButton({ feature, variables, label = 'Generate with AI', className = '', onGenerated }: AIGenerateButtonProps) {
  const { isConfigured, loading: configLoading } = useAI();
  const { generate, generating, result, error, reset } = useAIGenerate();
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  if (configLoading) return null;

  if (!isConfigured) {
    return (
      <button disabled className={`hp-btn hp-btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2 ${className}`} title="AI not configured">
        <Brain size={14} /> {label}
      </button>
    );
  }

  async function handleGenerate() {
    setShowDialog(true);
    const res = await generate(feature, variables);
    if (res && onGenerated) {
      onGenerated(res.content);
    }
  }

  function handleCopy() {
    if (result) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className={`hp-btn hp-btn-secondary flex items-center gap-2 ${className}`}
      >
        <Brain size={14} /> {label}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111827] border border-white/[0.08] rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Brain size={18} className="text-[var(--hp-primary)]" /> AI Generation
              </h3>
              <button onClick={() => { setShowDialog(false); reset(); }} className="text-[#666] hover:text-white">
                <X size={20} />
              </button>
            </div>

            {generating && (
              <div className="flex flex-col items-center py-12">
                <Loader2 size={32} className="text-[var(--hp-primary)] animate-spin mb-3" />
                <p className="text-sm text-[#888]">Generating content...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {result && !generating && (
              <div>
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg mb-4 max-h-64 overflow-y-auto">
                  <p className="text-sm text-white whitespace-pre-wrap">{result.content}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-[#666] mb-4">
                  <span>{result.model} &middot; {result.tokens} tokens &middot; {result.latency_ms}ms</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCopy} className="hp-btn hp-btn-secondary flex items-center gap-2">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleGenerate} className="hp-btn hp-btn-secondary flex items-center gap-2">
                    <RefreshCw size={14} /> Regenerate
                  </button>
                  <button onClick={() => { setShowDialog(false); reset(); }} className="hp-btn hp-btn-primary ml-auto">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

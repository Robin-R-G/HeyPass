'use client';

import { useState } from 'react';
import { useAIGenerate } from '@/hooks/use-ai';
import { Loader2, Brain, Copy, Check, X, RefreshCw } from 'lucide-react';

interface AIGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  title?: string;
  variables: Record<string, string>;
  onGenerated?: (content: string) => void;
}

export function AIGenerateDialog({ open, onClose, feature, title = 'AI Generation', variables, onGenerated }: AIGenerateDialogProps) {
  const { generate, generating, result, error, reset } = useAIGenerate();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleGenerate() {
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

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#111827] border border-white/[0.08] rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Brain size={18} className="text-[var(--hp-primary)]" /> {title}
          </h3>
          <button onClick={handleClose} className="text-[#666] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Variable preview */}
        <div className="mb-4 p-3 bg-white/[0.02] rounded-lg">
          <p className="text-xs text-[#888] mb-1.5">Input Variables</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(variables).map(([key, value]) => (
              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[#888]">
                {key}: {value?.substring(0, 30)}{value && value.length > 30 ? '...' : ''}
              </span>
            ))}
          </div>
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
          </div>
        )}

        <div className="flex gap-3">
          {!result && !generating && (
            <button onClick={handleGenerate} className="hp-btn hp-btn-primary flex items-center gap-2 w-full justify-center">
              <Brain size={14} /> Generate
            </button>
          )}
          {result && (
            <>
              <button onClick={handleCopy} className="hp-btn hp-btn-secondary flex items-center gap-2">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleGenerate} className="hp-btn hp-btn-secondary flex items-center gap-2">
                <RefreshCw size={14} /> Regenerate
              </button>
              <button onClick={handleClose} className="hp-btn hp-btn-primary ml-auto">
                Done
              </button>
            </>
          )}
          {!result && !generating && (
            <button onClick={handleClose} className="hp-btn hp-btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

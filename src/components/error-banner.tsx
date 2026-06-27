'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  retry?: () => void;
  dismiss?: () => void;
  variant?: 'error' | 'warning';
  className?: string;
}

export function ErrorBanner({
  title = 'Something went wrong',
  message,
  retry,
  dismiss,
  variant = 'error',
  className = '',
}: ErrorBannerProps) {
  const styles = variant === 'error'
    ? 'bg-[var(--hp-error-bg)] border-[var(--hp-error)]/20 text-[var(--hp-error)]'
    : 'bg-[var(--hp-warning-bg)] border-[var(--hp-warning)]/20 text-[var(--hp-warning)]';

  return (
    <div className={`flex items-start gap-3 p-4 rounded-[var(--hp-radius-md)] border ${styles} ${className}`} role="alert">
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs opacity-80 mt-0.5">{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {retry && (
          <button
            onClick={retry}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[var(--hp-radius-sm)] bg-[var(--hp-surface)] hover:bg-[var(--hp-surface-hover)] transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        )}
        {dismiss && (
          <button onClick={dismiss} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ message, className = '' }: { message: string; className?: string }) {
  return <p className={`text-xs text-[var(--hp-error)] ${className}`}>{message}</p>;
}

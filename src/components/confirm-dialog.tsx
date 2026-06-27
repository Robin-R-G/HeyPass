'use client';

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  icon,
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const variantStyles = {
    default: {
      icon: icon || <AlertTriangle size={20} className="text-[var(--hp-primary)]" />,
      bg: 'bg-[var(--hp-primary)]/10',
      btn: 'bg-[var(--hp-primary)] hover:bg-[var(--hp-primary-hover)] text-white',
    },
    danger: {
      icon: icon || <Trash2 size={20} className="text-[var(--hp-error)]" />,
      bg: 'bg-[var(--hp-error-bg)]',
      btn: 'bg-[var(--hp-error)] hover:brightness-110 text-white',
    },
    warning: {
      icon: icon || <AlertTriangle size={20} className="text-[var(--hp-warning)]" />,
      bg: 'bg-[var(--hp-warning-bg)]',
      btn: 'bg-[var(--hp-warning)] hover:bg-[#D97706] text-white',
    },
  };

  const v = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[var(--hp-z-modal)] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 animate-[hp-overlay-in_0.2s_var(--hp-ease-out)]"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[var(--hp-glass-bg)] backdrop-blur-xl border border-[var(--hp-glass-border)] rounded-[var(--hp-radius-xl)] shadow-[var(--hp-shadow-xl)] p-6 animate-[hp-modal-in_0.25s_var(--hp-ease-spring)]">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-1 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] transition-colors rounded-[var(--hp-radius-sm)] hover:bg-[var(--hp-surface-hover)]"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-[var(--hp-radius-md)] ${v.bg} flex items-center justify-center shrink-0`}>
            {v.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--hp-text)]">{title}</h3>
            {description && (
              <p className="text-sm text-[var(--hp-text-muted)] mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 text-sm text-[var(--hp-text-secondary)] bg-[var(--hp-surface)] border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] hover:bg-[var(--hp-surface-hover)] hover:border-[var(--hp-border-hover)] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-[var(--hp-radius-md)] transition-colors ${v.btn} disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    variant?: 'default' | 'danger' | 'warning';
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', onConfirm: () => {} });

  const confirm = React.useCallback((
    options: {
      title: string;
      description?: string;
      variant?: 'default' | 'danger' | 'warning';
      confirmLabel?: string;
    }
  ) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        ...options,
        onConfirm: () => {
          setState(prev => ({ ...prev, open: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => setState(prev => ({ ...prev, open }))}
      title={state.title}
      description={state.description}
      variant={state.variant}
      confirmLabel={state.confirmLabel}
      onConfirm={state.onConfirm}
    />
  ), [state]);

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}

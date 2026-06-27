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
      icon: icon || <AlertTriangle size={20} className="text-[#FCA311]" />,
      bg: 'bg-[#FCA311]/10',
      btn: 'bg-[#FCA311] hover:bg-[#e5950a] text-black',
    },
    danger: {
      icon: icon || <Trash2 size={20} className="text-[#ef4444]" />,
      bg: 'bg-[#ef4444]/10',
      btn: 'bg-[#ef4444] hover:bg-[#dc2626] text-white',
    },
    warning: {
      icon: icon || <AlertTriangle size={20} className="text-[#FCA311]" />,
      bg: 'bg-[#FCA311]/10',
      btn: 'bg-[#FCA311] hover:bg-[#e5950a] text-black',
    },
  };

  const v = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0a0a0a] border border-white/[0.08] rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-1 text-[#666] hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-xl ${v.bg} flex items-center justify-center shrink-0`}>
            {v.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-[#888] mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 text-sm text-[#ccc] bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.10] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${v.btn} disabled:opacity-50`}
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

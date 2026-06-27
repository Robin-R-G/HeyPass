'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setAnimating(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else if (visible) {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!visible) return null;

  const iconBgClass = variant === 'danger'
    ? 'bg-[var(--hp-error-bg)]'
    : variant === 'warning'
    ? 'bg-[var(--hp-warning-bg)]'
    : 'bg-[var(--hp-primary)]/10';

  const iconColorClass = variant === 'danger'
    ? 'text-[var(--hp-error)]'
    : variant === 'warning'
    ? 'text-[var(--hp-warning)]'
    : 'text-[var(--hp-primary)]';

  const confirmClass = variant === 'danger'
    ? 'bg-[var(--hp-error)] hover:bg-[#E11D48] text-white shadow-sm'
    : 'bg-[var(--hp-primary)] hover:bg-[var(--hp-primary-hover)] text-white shadow-sm';

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onCancel(); }}
      className={`fixed inset-0 z-[var(--hp-z-modal)] flex items-center justify-center p-6 transition-all duration-[var(--hp-duration-base)] ${
        animating ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
    >
      <div className={`w-full max-w-[420px] bg-[var(--hp-bg-elevated)] border border-[var(--hp-border)] rounded-[var(--hp-radius-xl)] shadow-[var(--hp-shadow-xl)] p-8 transition-all duration-[var(--hp-duration-slow)] ease-[var(--hp-ease-spring)] ${
        animating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.95] translate-y-2'
      }`}>
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-11 h-11 rounded-[var(--hp-radius-md)] ${iconBgClass} flex items-center justify-center shrink-0`}>
            {variant === 'danger'
              ? <Trash2 size={20} className={iconColorClass} />
              : <AlertTriangle size={20} className={iconColorClass} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[var(--hp-text)]">{title}</h3>
            <p className="text-sm text-[var(--hp-text-muted)] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--hp-text-secondary)] bg-[var(--hp-surface)] border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] hover:bg-[var(--hp-surface-hover)] hover:border-[var(--hp-border-hover)] transition-all duration-[var(--hp-duration-fast)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-[var(--hp-radius-md)] transition-all duration-[var(--hp-duration-fast)] active:scale-[0.98] ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptModalProps {
  open: boolean;
  title: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  open,
  title,
  message,
  placeholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setVisible(true);
      setAnimating(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
          inputRef.current?.focus();
        });
      });
    } else if (visible) {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel, onConfirm, value]);

  if (!visible) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onCancel(); }}
      className={`fixed inset-0 z-[var(--hp-z-modal)] flex items-center justify-center p-6 transition-all duration-[var(--hp-duration-base)] ${
        animating ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
    >
      <div className={`w-full max-w-[420px] bg-[var(--hp-bg-elevated)] border border-[var(--hp-border)] rounded-[var(--hp-radius-xl)] shadow-[var(--hp-shadow-xl)] p-8 transition-all duration-[var(--hp-duration-slow)] ease-[var(--hp-ease-spring)] ${
        animating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.95] translate-y-2'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-semibold text-[var(--hp-text)]">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface-hover)] rounded-[var(--hp-radius-sm)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-sm text-[var(--hp-text-muted)] mb-5">{message}</p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className="hp-input mb-5"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--hp-text-secondary)] bg-[var(--hp-surface)] border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] hover:bg-[var(--hp-surface-hover)] hover:border-[var(--hp-border-hover)] transition-all duration-[var(--hp-duration-fast)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
            className="px-5 py-2 text-sm font-semibold bg-[var(--hp-primary)] hover:bg-[var(--hp-primary-hover)] text-white rounded-[var(--hp-radius-md)] shadow-sm transition-all duration-[var(--hp-duration-fast)] active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

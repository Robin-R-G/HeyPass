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

  const iconBg = variant === 'danger' ? 'rgba(239,68,68,0.12)' : variant === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(252,163,17,0.12)';
  const iconColor = variant === 'danger' ? '#ef4444' : variant === 'warning' ? '#f59e0b' : 'var(--hp-primary)';
  const confirmBg = variant === 'danger'
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, var(--hp-primary), var(--hp-primary-dark))';
  const confirmShadow = variant === 'danger'
    ? '0 4px 12px rgba(239,68,68,0.25)'
    : '0 4px 12px rgba(252,163,17,0.25)';

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: animating ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
        backdropFilter: animating ? 'blur(8px)' : 'blur(0px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        transition: 'background 0.2s, backdrop-filter 0.2s',
      }}
    >
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', width: '100%', maxWidth: '420px',
        padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        opacity: animating ? 1 : 0,
        transform: animating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {variant === 'danger' ? <Trash2 size={20} style={{ color: iconColor }} /> : <AlertTriangle size={20} style={{ color: iconColor }} />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{title}</h3>
            <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: '#888', padding: '10px 20px', borderRadius: '10px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888'; }}
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: confirmBg, color: variant === 'danger' ? '#fff' : '#000',
              border: 'none', padding: '10px 24px', borderRadius: '10px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              boxShadow: confirmShadow, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >{confirmLabel}</button>
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
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: animating ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
        backdropFilter: animating ? 'blur(8px)' : 'blur(0px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        transition: 'background 0.2s, backdrop-filter 0.2s',
      }}
    >
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', width: '100%', maxWidth: '420px',
        padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        opacity: animating ? 1 : 0,
        transform: animating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255,255,255,0.05)', border: 'none',
              color: '#666', width: '28px', height: '28px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#666'; }}
          ><X size={14} /></button>
        </div>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>{message}</p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: '#111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#fff', fontSize: '14px', outline: 'none',
            transition: 'border-color 0.2s', marginBottom: '20px',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: '#888', padding: '10px 20px', borderRadius: '10px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888'; }}
          >{cancelLabel}</button>
          <button
            onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
            style={{
              background: 'linear-gradient(135deg, var(--hp-primary), var(--hp-primary-dark))',
              color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(252,163,17,0.25)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

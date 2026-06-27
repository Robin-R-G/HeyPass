'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    timers.current.set(id, setTimeout(() => remove(id), 4000));
  }, [remove]);

  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-[var(--hp-success)] shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 text-[var(--hp-error)] shrink-0" />,
    info: <Info className="w-4 h-4 text-[var(--hp-info)] shrink-0" />,
  };

  const borderMap: Record<ToastType, string> = {
    success: 'border-[var(--hp-success)]/20',
    error: 'border-[var(--hp-error)]/20',
    info: 'border-[var(--hp-info)]/20',
  };

  const bgMap: Record<ToastType, string> = {
    success: 'bg-[var(--hp-success-bg)]',
    error: 'bg-[var(--hp-error-bg)]',
    info: 'bg-[var(--hp-info-bg)]',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[var(--hp-z-toast)] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-[var(--hp-radius-md)] border px-4 py-3 shadow-[var(--hp-shadow-lg)] max-w-sm animate-[hp-toast-in_0.3s_var(--hp-ease-spring)] ${bgMap[t.type]} ${borderMap[t.type]}`}
          >
            {iconMap[t.type]}
            <span className="text-sm text-[var(--hp-text)] flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  autoFocus = false,
  onKeyDown,
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hp-text-muted)]" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        className="w-full pl-10 pr-9 py-2.5 bg-[var(--hp-surface)] border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] text-sm text-[var(--hp-text)] placeholder:text-[var(--hp-text-muted)] focus:outline-none focus:border-[var(--hp-border-focus)] focus:ring-2 focus:ring-[var(--hp-primary-glow)] transition-all duration-[var(--hp-duration-fast)]"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

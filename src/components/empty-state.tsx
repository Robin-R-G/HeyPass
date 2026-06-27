'use client';

import React from 'react';
import { Inbox, Search, Plus, ArrowRight, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'search' | 'minimal';
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
        variant === 'search' ? 'bg-[#FCA311]/10' : 'bg-white/[0.04]'
      }`}>
        <Icon size={28} className={variant === 'search' ? 'text-[#FCA311]' : 'text-[#555]'} />
      </div>

      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>

      {description && (
        <p className="text-sm text-[#888] text-center max-w-[320px] mb-6">{description}</p>
      )}

      {!description && <div className="mb-6" />}

      <div className="flex items-center gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FCA311] text-black font-semibold rounded-lg text-sm hover:bg-[#e5950a] transition-colors"
          >
            {action.icon && <action.icon size={16} />}
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] border border-white/[0.08] text-[#ccc] rounded-lg text-sm hover:bg-white/[0.10] transition-colors"
          >
            {secondaryAction.icon && <secondaryAction.icon size={16} />}
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyStateSearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      variant="search"
      action={onClear ? { label: 'Clear Search', onClick: onClear } : undefined}
    />
  );
}

export function EmptyStateTable({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <Inbox size={32} className="text-[#444] mb-3" />
      <p className="text-sm text-[#888]">{title || 'No records found'}</p>
      {description && <p className="text-xs text-[#666] mt-1">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#FCA311] text-black font-semibold rounded-lg text-xs hover:bg-[#e5950a] transition-colors"
        >
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

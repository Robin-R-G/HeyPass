'use client';

import React from 'react';
import { Inbox, Search, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: 'default' | 'secondary';
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
      <div className={`w-14 h-14 rounded-[var(--hp-radius-lg)] flex items-center justify-center mb-4 ${
        variant === 'search' ? 'bg-[var(--hp-primary)]/10' : 'bg-[var(--hp-surface)]'
      }`}>
        <Icon size={24} className={variant === 'search' ? 'text-[var(--hp-primary)]' : 'text-[var(--hp-text-muted)]'} />
      </div>

      <h3 className="text-base font-semibold text-[var(--hp-text)] mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-[var(--hp-text-muted)] text-center max-w-[320px] mb-6">{description}</p>
      )}

      {!description && <div className="mb-6" />}

      <div className="flex items-center gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant === 'secondary' ? 'secondary' : 'default'}
          >
            {action.icon && <action.icon size={16} />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="secondary"
          >
            {secondaryAction.icon && <secondaryAction.icon size={16} />}
            {secondaryAction.label}
          </Button>
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
      <Inbox size={28} className="text-[var(--hp-text-muted)] mb-3" />
      <p className="text-sm text-[var(--hp-text-secondary)]">{title || 'No records found'}</p>
      {description && <p className="text-xs text-[var(--hp-text-muted)] mt-1">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

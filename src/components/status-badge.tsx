'use client';

import React from 'react';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  // Success states
  success:     { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  connected:   { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  active:      { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  approved:    { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  completed:   { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  sent:        { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  delivered:   { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  read:        { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  paid:        { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  published:   { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },
  verified:    { bg: 'bg-[var(--hp-success-bg)]', text: 'text-[var(--hp-success)]', dot: 'bg-[var(--hp-success)]' },

  // Warning states
  warning:     { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },
  pending:     { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },
  draft:       { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },
  scheduled:   { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },
  restricted:  { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },
  unpaid:      { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },
  processing:  { bg: 'bg-[var(--hp-warning-bg)]', text: 'text-[var(--hp-warning)]', dot: 'bg-[var(--hp-warning)]' },

  // Error states
  error:       { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  failed:      { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  rejected:    { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  disconnected:{ bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  cancelled:   { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  revoked:     { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  blocked:     { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  expired:     { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },
  suspended:   { bg: 'bg-[var(--hp-error-bg)]', text: 'text-[var(--hp-error)]', dot: 'bg-[var(--hp-error)]' },

  // Info states
  info:        { bg: 'bg-[var(--hp-info-bg)]', text: 'text-[var(--hp-info)]', dot: 'bg-[var(--hp-info)]' },
  sending:     { bg: 'bg-[var(--hp-info-bg)]', text: 'text-[var(--hp-info)]', dot: 'bg-[var(--hp-info)]' },
  syncing:     { bg: 'bg-[var(--hp-info-bg)]', text: 'text-[var(--hp-info)]', dot: 'bg-[var(--hp-info)]' },

  // Default / Neutral
  default:     { bg: 'bg-[var(--hp-surface)]', text: 'text-[var(--hp-text-muted)]', dot: 'bg-[var(--hp-text-muted)]' },
  inactive:    { bg: 'bg-[var(--hp-surface)]', text: 'text-[var(--hp-text-muted)]', dot: 'bg-[var(--hp-text-muted)]' },
  archived:    { bg: 'bg-[var(--hp-surface)]', text: 'text-[var(--hp-text-muted)]', dot: 'bg-[var(--hp-text-muted)]' },
  disabled:    { bg: 'bg-[var(--hp-surface)]', text: 'text-[var(--hp-text-muted)]', dot: 'bg-[var(--hp-text-muted)]' },
};

function getStatusConfig(status: string) {
  const normalized = status.toLowerCase().trim();
  return STATUS_CONFIG[normalized] || STATUS_CONFIG.default;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-[var(--hp-radius-full)] border border-transparent ${config.bg} ${config.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

export function StatusDot({ status, className = '' }: { status: string; className?: string }) {
  const config = getStatusConfig(status);
  return <span className={`inline-block w-2 h-2 rounded-full ${config.dot} ${className}`} />;
}

export { STATUS_CONFIG };

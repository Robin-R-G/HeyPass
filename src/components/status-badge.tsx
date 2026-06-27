'use client';

import React from 'react';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'pending' | 'active' | 'inactive' | 'draft' | 'archived';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  success: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  connected: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  active: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  approved: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  completed: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  sent: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  delivered: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  read: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  paid: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },
  published: { bg: 'bg-[#10b981]/12', text: 'text-[#10b981]' },

  warning: { bg: 'bg-[#FCA311]/12', text: 'text-[#FCA311]' },
  pending: { bg: 'bg-[#FCA311]/12', text: 'text-[#FCA311]' },
  draft: { bg: 'bg-[#FCA311]/12', text: 'text-[#FCA311]' },
  scheduled: { bg: 'bg-[#FCA311]/12', text: 'text-[#FCA311]' },
  restricted: { bg: 'bg-[#FCA311]/12', text: 'text-[#FCA311]' },
  unpaid: { bg: 'bg-[#FCA311]/12', text: 'text-[#FCA311]' },

  error: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  failed: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  rejected: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  disconnected: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  cancelled: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  revoked: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  blocked: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  expired: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },
  suspended: { bg: 'bg-[#ef4444]/12', text: 'text-[#ef4444]' },

  info: { bg: 'bg-blue-500/12', text: 'text-blue-400' },
  sending: { bg: 'bg-blue-500/12', text: 'text-blue-400' },

  default: { bg: 'bg-white/[0.06]', text: 'text-[#888]' },
  inactive: { bg: 'bg-white/[0.06]', text: 'text-[#888]' },
  archived: { bg: 'bg-white/[0.06]', text: 'text-[#888]' },
  disabled: { bg: 'bg-white/[0.06]', text: 'text-[#888]' },
};

function getStatusStyle(status: string): { bg: string; text: string } {
  const normalized = status.toLowerCase().trim();
  return STATUS_STYLES[normalized] || STATUS_STYLES.default;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const style = getStatusStyle(status);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${style.bg} ${style.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      {status}
    </span>
  );
}

export function StatusDot({ status, className = '' }: { status: string; className?: string }) {
  const style = getStatusStyle(status);
  const dotColor = style.text.replace('text-', 'bg-');
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${dotColor} ${className}`} />
  );
}

export { STATUS_STYLES };

'use client';

import React from 'react';
import { Clock, User, Calendar, FileText, MessageCircle, Award, Settings, CreditCard, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  actor_email?: string;
  target?: string;
  target_type?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  result?: 'success' | 'error' | 'warning';
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <CheckCircle size={14} className="text-[#10b981]" />,
  updated: <FileText size={14} className="text-[#FCA311]" />,
  deleted: <XCircle size={14} className="text-[#ef4444]" />,
  sent: <MessageCircle size={14} className="text-[#10b981]" />,
  published: <CheckCircle size={14} className="text-[#10b981]" />,
  cancelled: <XCircle size={14} className="text-[#ef4444]" />,
  generated: <Award size={14} className="text-[#FCA311]" />,
  payment: <CreditCard size={14} className="text-[#10b981]" />,
  invited: <User size={14} className="text-blue-400" />,
  removed: <XCircle size={14} className="text-[#ef4444]" />,
  default: <Clock size={14} className="text-[#888]" />,
};

function getActionIcon(action: string): React.ReactNode {
  const lower = action.toLowerCase();
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return ACTION_ICONS.default;
}

function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function ActivityTimeline({
  activities,
  loading = false,
  emptyMessage = 'No activity recorded yet.',
  className = '',
}: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className={`flex flex-col gap-0 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-3 w-2/3 bg-white/[0.06] rounded animate-pulse mb-2" />
              <div className="h-2 w-1/3 bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock size={24} className="mx-auto mb-2 text-[#444]" />
        <p className="text-sm text-[#888]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/[0.06]" />

      <div className="flex flex-col">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 py-3 relative">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] border border-white/[0.08] flex items-center justify-center shrink-0 z-10">
              {getActionIcon(activity.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#ccc] leading-snug">
                <span className="text-white font-medium">{activity.actor}</span>
                {' '}{activity.action}
                {activity.target && (
                  <> <span className="text-white font-medium">{activity.target}</span></>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[#666]">{timeAgo(activity.timestamp)}</span>
                {activity.target_type && (
                  <span className="text-[11px] text-[#555] bg-white/[0.04] px-1.5 py-0.5 rounded">{activity.target_type}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

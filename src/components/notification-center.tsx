'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Filter, X, Calendar, Users, MessageCircle, Award, Settings } from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'event' | 'registration' | 'payment' | 'certificate' | 'whatsapp' | 'team' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  href?: string;
  actor?: string;
}

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  event: <Calendar size={14} />,
  registration: <Users size={14} />,
  payment: <Check size={14} />,
  certificate: <Award size={14} />,
  whatsapp: <MessageCircle size={14} />,
  team: <Users size={14} />,
  system: <Settings size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-400 bg-blue-500/10',
  success: 'text-[#10b981] bg-[#10b981]/10',
  warning: 'text-[#FCA311] bg-[#FCA311]/10',
  error: 'text-[#ef4444] bg-[#ef4444]/10',
};

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

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?filter=${filter}&limit=20`);
      const data = await res.json();
      setNotifications(Array.isArray(data.data) ? data.data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const markAsRead = async (id: string) => {
    setMarkingRead(id);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch {
      // Ignore
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // Ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className="relative p-2 text-[#888] hover:text-white transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FCA311] text-black text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" onClick={() => onOpenChange(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-14 right-4 w-[380px] max-h-[520px] bg-[#0a0a0a] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                      filter === 'all' ? 'bg-white/[0.08] text-white' : 'text-[#666] hover:text-[#888]'
                    }`}
                  >All</button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-2 py-0.5 text-[11px] rounded-full transition-colors ${
                      filter === 'unread' ? 'bg-white/[0.08] text-white' : 'text-[#666] hover:text-[#888]'
                    }`}
                  >Unread</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-[#FCA311] hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => onOpenChange(false)} className="p-1 text-[#666] hover:text-white">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-[#666] text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-[#444]" />
                  <p className="text-sm text-[#888]">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${
                      !n.read ? 'bg-white/[0.01]' : ''
                    }`}
                    onClick={() => {
                      if (!n.read) markAsRead(n.id);
                      if (n.href) {
                        onOpenChange(false);
                        window.location.href = n.href;
                      }
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[n.type]}`}>
                      {CATEGORY_ICONS[n.category] || <Bell size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-tight">{n.title}</p>
                      <p className="text-xs text-[#888] mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#555]">{timeAgo(n.created_at)}</span>
                        {n.actor && <span className="text-[10px] text-[#555]">by {n.actor}</span>}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#FCA311] shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] text-center">
              <button className="text-xs text-[#FCA311] hover:underline">View all notifications</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

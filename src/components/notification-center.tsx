'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, X, Calendar, Users, MessageCircle, Award, Settings } from 'lucide-react';

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
  info: 'text-[var(--hp-info)] bg-[var(--hp-info-bg)]',
  success: 'text-[var(--hp-success)] bg-[var(--hp-success-bg)]',
  warning: 'text-[var(--hp-warning)] bg-[var(--hp-warning-bg)]',
  error: 'text-[var(--hp-error)] bg-[var(--hp-error-bg)]',
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
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (id: string) => {
    setMarkingRead(id);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* Ignore */ }
    finally { setMarkingRead(null); }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* Ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className="relative p-2 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface-hover)] rounded-[var(--hp-radius-sm)] transition-all duration-[var(--hp-duration-fast)]"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--hp-primary)] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[var(--hp-z-dropdown)]" onClick={() => onOpenChange(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-14 right-4 w-[380px] max-h-[520px] bg-[var(--hp-glass-bg)] backdrop-blur-xl border border-[var(--hp-glass-border)] rounded-[var(--hp-radius-xl)] shadow-[var(--hp-shadow-xl)] overflow-hidden flex flex-col animate-[hp-slide-down_0.15s_var(--hp-ease-out)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hp-glass-border)]">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-[var(--hp-text)]">Notifications</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2 py-0.5 text-[11px] rounded-[var(--hp-radius-full)] transition-colors ${
                      filter === 'all' ? 'bg-[var(--hp-surface-active)] text-[var(--hp-text)]' : 'text-[var(--hp-text-muted)] hover:text-[var(--hp-text-secondary)]'
                    }`}
                  >All</button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-2 py-0.5 text-[11px] rounded-[var(--hp-radius-full)] transition-colors ${
                      filter === 'unread' ? 'bg-[var(--hp-surface-active)] text-[var(--hp-text)]' : 'text-[var(--hp-text-muted)] hover:text-[var(--hp-text-secondary)]'
                    }`}
                  >Unread</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-[var(--hp-primary)] hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => onOpenChange(false)} className="p-1 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] rounded-[var(--hp-radius-sm)]">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-[var(--hp-text-muted)] text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-[var(--hp-text-muted)]" />
                  <p className="text-sm text-[var(--hp-text-secondary)]">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-3 border-b border-[var(--hp-border)] hover:bg-[var(--hp-surface-hover)] transition-colors cursor-pointer ${
                      !n.read ? 'bg-[var(--hp-surface)]' : ''
                    }`}
                    onClick={() => {
                      if (!n.read) markAsRead(n.id);
                      if (n.href) {
                        onOpenChange(false);
                        window.location.href = n.href;
                      }
                    }}
                  >
                    <div className={`w-8 h-8 rounded-[var(--hp-radius-sm)] flex items-center justify-center shrink-0 ${TYPE_COLORS[n.type]}`}>
                      {CATEGORY_ICONS[n.category] || <Bell size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--hp-text)] leading-tight">{n.title}</p>
                      <p className="text-xs text-[var(--hp-text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--hp-text-muted)]">{timeAgo(n.created_at)}</span>
                        {n.actor && <span className="text-[10px] text-[var(--hp-text-muted)]">by {n.actor}</span>}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--hp-primary)] shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-[var(--hp-glass-border)] text-center">
              <button className="text-xs text-[var(--hp-primary)] hover:underline">View all notifications</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

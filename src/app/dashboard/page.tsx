'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatusBadge } from '@/components/status-badge';
import { CalendarDays, Plus, Building2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_date: string;
  end_date: string;
  venue: string;
  registrations_count: number;
  check_ins_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.is_superadmin && !payload.client_id) {
          router.push('/superadmin');
          return;
        }
      }
    } catch {}

    authFetch('/api/events')
      .then(r => {
        if (r.status === 403) {
          setError('NO_CLIENT');
          setLoading(false);
          return;
        }
        return r.json();
      })
      .then(data => {
        if (data) {
          setEvents(data.events || data.data || data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Failed to load events');
        setLoading(false);
      });
  }, [router]);

  return (
    <DashboardShell>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {/* Page Header */}
        <div className="hp-page-header">
          <div>
            <h1 className="hp-page-title">Your Events</h1>
            <p className="hp-page-subtitle">Manage and monitor all your events</p>
          </div>
          {!loading && !error && events.length > 0 && (
            <Button onClick={() => router.push('/dashboard/events/new')}>
              <Plus size={16} />
              New Event
            </Button>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="hp-card animate-hp-fade-in" style={{ animationDelay: `${(i - 1) * 50}ms` }}>
                <div className="flex justify-between items-start">
                  <div className="space-y-2.5 flex-1">
                    <div className="hp-skeleton h-5 w-48" />
                    <div className="hp-skeleton h-3 w-64" />
                  </div>
                  <div className="hp-skeleton h-6 w-20 rounded-[var(--hp-radius-full)]" />
                </div>
                <div className="flex gap-8 mt-4 pt-4 border-t border-[var(--hp-border)]">
                  <div className="hp-skeleton h-4 w-24" />
                  <div className="hp-skeleton h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && error !== 'NO_CLIENT' && (
          <div role="alert" className="bg-[var(--hp-error-bg)] border border-[var(--hp-error)]/20 rounded-[var(--hp-radius-lg)] p-6 text-center text-[var(--hp-error)] text-sm">
            {error}
          </div>
        )}

        {/* No client */}
        {error === 'NO_CLIENT' && (
          <div className="hp-card p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hp-surface)] flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-[var(--hp-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--hp-text)] mb-2">No organization found</h3>
            <p className="text-[var(--hp-text-muted)] text-sm mb-6">You need to select or create an organization first</p>
            <Button onClick={() => router.push('/auth/select-client')}>Select Organization</Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="hp-card p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hp-surface)] flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7 text-[var(--hp-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--hp-text)] mb-2">No events yet</h3>
            <p className="text-[var(--hp-text-muted)] text-sm mb-6">Create your first event to get started</p>
            <Button onClick={() => router.push('/dashboard/events/new')}>
              <Plus size={16} />
              Create Event
            </Button>
          </div>
        )}

        {/* Events list */}
        {!loading && !error && events.length > 0 && (
          <div className="space-y-3 stagger-children">
            {events.map(event => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}/dashboard`}
                className="hp-card hp-card-interactive block p-5 sm:p-6 no-underline group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[var(--hp-text)] mb-1 truncate group-hover:text-[var(--hp-primary)] transition-colors">{event.title}</h3>
                    <p className="text-[var(--hp-text-muted)] text-xs">
                      {event.venue || 'No venue'} · {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex gap-8 mt-4 pt-4 border-t border-[var(--hp-border)]">
                  <div>
                    <span className="text-base font-bold text-[var(--hp-text-secondary)]">{event.registrations_count || 0}</span>
                    <span className="text-[var(--hp-text-muted)] text-xs ml-1.5">registered</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-[var(--hp-primary)]">{event.check_ins_count || 0}</span>
                    <span className="text-[var(--hp-text-muted)] text-xs ml-1.5">checked in</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

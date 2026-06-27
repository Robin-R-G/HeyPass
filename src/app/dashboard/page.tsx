'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

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
    <div className="min-h-screen font-sans antialiased relative">
      {/* Nav */}
      <nav className="sticky top-0 z-[var(--hp-z-sticky)] bg-[var(--hp-glass-bg)] backdrop-blur-xl border-b border-[var(--hp-border)]">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center px-4 sm:px-8 h-14">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-[var(--hp-radius-sm)] bg-[var(--hp-primary)] flex items-center justify-center font-extrabold text-sm text-white">H</div>
            <span className="text-lg font-bold text-[var(--hp-text)]">HeyPass</span>
          </Link>
          <div className="flex gap-1 items-center">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-[var(--hp-radius-sm)] text-sm font-medium text-[var(--hp-primary)] bg-[var(--hp-primary)]/10 no-underline">Events</Link>
            <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-[var(--hp-radius-sm)] text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface)] no-underline transition-colors">Settings</Link>
            <button onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); router.push('/auth/login'); }}
              className="px-3 py-1.5 rounded-[var(--hp-radius-sm)] text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface)] transition-colors min-h-[36px]">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-10 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--hp-text)] tracking-tight">Your Events</h1>
          <p className="text-[var(--hp-text-muted)] text-sm mt-1">Manage and monitor all your events</p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-[var(--hp-radius-lg)] border border-[var(--hp-border)] bg-[var(--hp-bg-elevated)] p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="hp-skeleton h-5 w-48" />
                    <div className="hp-skeleton h-3 w-64" />
                  </div>
                  <div className="hp-skeleton h-5 w-16 rounded-[var(--hp-radius-full)]" />
                </div>
                <div className="flex gap-8 mt-4">
                  <div className="hp-skeleton h-4 w-20" />
                  <div className="hp-skeleton h-4 w-20" />
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
          <div className="rounded-[var(--hp-radius-lg)] border border-[var(--hp-border)] bg-[var(--hp-bg-elevated)] p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hp-surface)] flex items-center justify-center mx-auto mb-4 text-3xl" role="img" aria-label="Organization">🏢</div>
            <h3 className="text-lg font-semibold text-[var(--hp-text)] mb-2">No organization found</h3>
            <p className="text-[var(--hp-text-muted)] text-sm mb-6">You need to select or create an organization first</p>
            <Button onClick={() => router.push('/auth/select-client')}>Select Organization</Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="rounded-[var(--hp-radius-lg)] border border-[var(--hp-border)] bg-[var(--hp-bg-elevated)] p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hp-surface)] flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7 text-[var(--hp-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--hp-text)] mb-2">No events yet</h3>
            <p className="text-[var(--hp-text-muted)] text-sm mb-6">Create your first event to get started</p>
            <Button onClick={() => router.push('/dashboard/events/new')}>Create Event</Button>
          </div>
        )}

        {/* Events list */}
        {!loading && !error && events.length > 0 && (
          <div className="space-y-3">
            {events.map(event => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}/dashboard`}
                className="block rounded-[var(--hp-radius-lg)] border border-[var(--hp-border)] bg-[var(--hp-bg-elevated)] p-5 sm:p-6 no-underline transition-all duration-[var(--hp-duration-base)] hover:shadow-[var(--hp-shadow-md)] hover:border-[var(--hp-border-hover)]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-[var(--hp-text)] mb-1 truncate">{event.title}</h3>
                    <p className="text-[var(--hp-text-muted)] text-xs">
                      {event.venue || 'No venue'} · {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-[var(--hp-radius-full)] text-[10px] font-semibold uppercase tracking-wider ${
                    event.status === 'published'
                      ? 'bg-[var(--hp-success-bg)] text-[var(--hp-success)]'
                      : 'bg-[var(--hp-surface)] text-[var(--hp-text-muted)]'
                  }`}>
                    {event.status}
                  </span>
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
      </main>
    </div>
  );
}

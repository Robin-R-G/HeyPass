'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays } from 'lucide-react';

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
        if (payload.is_superadmin) {
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
    <div className="min-h-screen bg-[#000] text-white font-sans antialiased relative">
      <div className="hp-bg-gradient" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[rgba(20,33,61,0.85)] backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center px-4 sm:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-sm text-black">H</div>
            <span className="text-lg font-bold text-white">HeyPass</span>
          </Link>
          <div className="flex gap-1 sm:gap-2 items-center">
            <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-[#FCA311] bg-[#FCA311]/10 no-underline">Events</Link>
            <Link href="/dashboard/settings" className="px-3 py-2 rounded-lg text-sm font-medium text-[#999] hover:text-white hover:bg-white/5 no-underline transition-colors">Settings</Link>
            <button onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); router.push('/auth/login'); }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#999] hover:text-white hover:bg-white/5 transition-colors min-h-[44px]">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-10 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Your Events</h1>
          <p className="text-[#888] text-sm mt-1">Manage and monitor all your events</p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="hp-glass-card p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="hp-skeleton h-5 w-48 rounded" />
                    <div className="hp-skeleton h-3 w-64 rounded" />
                  </div>
                  <div className="hp-skeleton h-5 w-16 rounded" />
                </div>
                <div className="flex gap-8 mt-4">
                  <div className="hp-skeleton h-4 w-20 rounded" />
                  <div className="hp-skeleton h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && error !== 'NO_CLIENT' && (
          <div role="alert" className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-6 text-center text-[#ef4444] text-sm">
            {error}
          </div>
        )}

        {/* No client */}
        {error === 'NO_CLIENT' && (
          <div className="hp-glass-card p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-3xl" role="img" aria-label="Organization">🏢</div>
            <h3 className="text-lg font-semibold text-white mb-2">No organization found</h3>
            <p className="text-[#999] text-sm mb-6">You need to select or create an organization first</p>
            <Button onClick={() => router.push('/auth/select-client')} className="font-bold text-sm">Select Organization</Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="hp-glass-card p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7 text-[#888]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
            <p className="text-[#999] text-sm mb-6">Create your first event to get started</p>
            <Button onClick={() => router.push('/dashboard/events/new')} className="font-bold text-sm">Create Event</Button>
          </div>
        )}

        {/* Events list */}
        {!loading && !error && events.length > 0 && (
          <div className="space-y-4">
            {events.map(event => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}/dashboard`}
                className="block hp-glass-card p-5 sm:p-6 no-underline hover:border-[rgba(252,163,17,0.35)] transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">{event.title}</h3>
                    <p className="text-[#999] text-xs">
                      {event.venue || 'No venue'} · {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    event.status === 'published' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-white/10 text-[#ccc]'
                  }`}>
                    {event.status}
                  </span>
                </div>
                <div className="flex gap-8 mt-4 pt-4 border-t border-white/[0.06]">
                  <div>
                    <span className="text-base font-bold text-[#ccc]">{event.registrations_count || 0}</span>
                    <span className="text-[#888] text-xs ml-1.5">registered</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#FCA311]">{event.check_ins_count || 0}</span>
                    <span className="text-[#888] text-xs ml-1.5">checked in</span>
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

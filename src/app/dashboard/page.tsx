'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { Card } from '@/components/ui/card';

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

    // Redirect superadmins to superadmin dashboard
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

  const statusColor = (s: string) => {
    switch (s) {
      case 'published': return 'bg-hp-success/15 text-hp-success';
      case 'draft': return 'bg-hp-surface/10 text-hp-text-secondary';
      case 'ended': return 'bg-hp-primary/15 text-hp-primary';
      default: return 'bg-hp-warning/15 text-hp-warning';
    }
  };

  return (
    <div className="min-h-screen bg-hp-bg text-hp-text font-sans antialiased hp-animate-fade-in relative">
      {/* Background decoration */}
      <div className="hp-bg-gradient" />

      {/* Nav */}
      <nav className="hp-nav flex justify-between items-center px-8 py-4">
        <Link href="/" className="flex items-center gap-2 no-underline focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none rounded">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-sm text-black">H</div>
          <span className="text-lg font-bold text-white">HeyPass</span>
        </Link>
        <div className="flex gap-5 items-center">
          <Link href="/dashboard" className="hp-nav-item hp-nav-item-active">Events</Link>
          <Link href="/dashboard/settings/branding" className="hp-nav-item">Settings</Link>
          <button onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); router.push('/auth/login'); }}
            className="hp-btn hp-btn-ghost text-sm">Sign Out</button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-white tracking-tight">Your Events</h1>
            <p className="text-[#888] text-sm">Manage and monitor all your events</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-[#E5E5E5] animate-pulse">Loading events...</div>
        )}

        {error && error !== 'NO_CLIENT' && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-6 text-center text-[#ef4444]">
            {error}
          </div>
        )}

        {error === 'NO_CLIENT' && (
          <Card className="p-16 text-center hp-glass-card hp-animate-fade-in">
            <div className="text-3xl mb-4" role="img" aria-label="Organization">🏢</div>
            <h3 className="text-lg font-semibold mb-2 text-white">No organization found</h3>
            <p className="text-[#E5E5E5] text-sm mb-6">
              You need to select or create an organization first
            </p>
            <button
              onClick={() => router.push('/auth/select-client')}
              className="bg-gradient-to-r from-[#FCA311] to-[#E09800] text-black font-bold px-6 py-2.5 rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none"
            >
              Select Organization
            </button>
          </Card>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-16 text-center">
            <div className="text-3xl mb-4" role="img" aria-label="Events">📋</div>
            <h3 className="text-lg font-semibold mb-2 text-white">No events yet</h3>
            <p className="text-[#E5E5E5] text-sm mb-6">
              Create your first event to get started
            </p>
            <button
              onClick={() => router.push('/dashboard/events/new')}
              className="bg-gradient-to-r from-[#FCA311] to-[#E09800] text-black font-bold px-6 py-2.5 rounded-xl cursor-pointer text-sm transition-all focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none"
            >
              Create Event
            </button>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="grid gap-4">
            {events.map(event => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}/dashboard`}
                className="block hp-card hp-glass-card hp-animate-fade-in hover:hp-card-highlighted"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#FCA311] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-[#E5E5E5] text-xs">
                      {event.venue || 'No venue'} · {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    event.status === 'published' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-white/10 text-[#E5E5E5]'
                  }`}>
                    {event.status}
                  </span>
                </div>
                <div className="flex gap-8 mt-4">
                  <div>
                    <span className="text-base font-bold text-[#E5E5E5]">{event.registrations_count || 0}</span>
                    <span className="text-[#888888] text-xs ml-1.5">registered</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#FCA311]">{event.check_ins_count || 0}</span>
                    <span className="text-[#888888] text-xs ml-1.5">checked in</span>
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

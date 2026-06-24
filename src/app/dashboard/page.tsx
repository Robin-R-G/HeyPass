'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated } from '@/lib/auth-client';

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
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'ended': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased relative">
      {/* Background decoration */}
      <div className="hp-bg-gradient" />

      {/* Nav */}
      <nav className="hp-nav flex justify-between items-center px-8 py-4">
        <Link href="/" className="flex items-center gap-2 no-underline focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none rounded">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FCA311] to-[#E09800] flex items-center justify-center font-extrabold text-sm text-black">H</div>
          <span className="text-lg font-bold text-white">HeyPass</span>
        </Link>
        <div className="flex gap-5 items-center">
          <Link href="/dashboard" className="text-[#FCA311] hover:text-[#FCD34D] no-underline text-xs font-semibold tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none rounded px-1.5 py-0.5">Events</Link>
          <Link href="/dashboard/settings/branding" className="text-[#888] hover:text-white no-underline text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none rounded px-1.5 py-0.5">Settings</Link>
          <button onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); router.push('/auth/login'); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#ef4444] bg-[#ef4444]/12 hover:bg-[#ef4444]/22 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#ef4444] focus:outline-none">Sign Out</button>
        </div>
      </nav>

      <div className="max-w-[1100px] mx-auto px-8 py-10 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-white tracking-tight">Your Events</h1>
            <p className="text-[#E5E5E5] text-sm">Manage and monitor all your events</p>
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
          <div className="bg-[#14213D]/60 border border-white/5 rounded-2xl p-16 text-center">
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
          </div>
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
                className="block bg-white/[0.03] border border-white/5 hover:border-[#FCA311]/30 hover:bg-white/[0.05] rounded-xl px-6 py-5 transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-[#FCA311] focus:outline-none"
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
      </div>
    </div>
  );
}

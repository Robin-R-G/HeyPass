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
      window.location.href = '/auth/login';
      return;
    }
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
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'ended': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', borderBottom: '1px solid rgba(229,229,229,0.08)',
        background: 'rgba(20,33,61,0.6)', backdropFilter: 'blur(16px)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #FCA311, #E09800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.9rem', color: '#000',
          }}>H</div>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>HeyPass</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <Link href="/dashboard/settings/branding" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Settings</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Your Events</h1>
            <p style={{ color: '#E5E5E5', fontSize: '0.9rem' }}>Manage and monitor all your events</p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#E5E5E5' }}>Loading events...</div>
        )}

        {error && error !== 'NO_CLIENT' && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        {error === 'NO_CLIENT' && (
          <div style={{
            background: 'rgba(20,33,61,0.6)', border: '1px solid rgba(229,229,229,0.08)',
            borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏢</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No organization found</h3>
            <p style={{ color: '#E5E5E5', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You need to select or create an organization first
            </p>
            <button
              onClick={() => window.location.href = '/auth/select-client'}
              style={{
                background: 'linear-gradient(135deg, #FCA311, #E09800)',
                color: '#000', padding: '0.75rem 1.5rem', borderRadius: '10px',
                border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Select Organization
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div style={{
            background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)',
            borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No events yet</h3>
            <p style={{ color: '#E5E5E5', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Create your first event to get started
            </p>
            <button
              onClick={() => router.push('/dashboard/events/new')}
              style={{
                background: 'linear-gradient(135deg, #FCA311, #E09800)',
                color: '#000', padding: '0.75rem 1.5rem', borderRadius: '10px',
                border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Create Event
            </button>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {events.map(event => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}/dashboard`}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)',
                  borderRadius: '14px', padding: '1.25rem 1.5rem',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                      {event.title}
                    </h3>
                    <p style={{ color: '#E5E5E5', fontSize: '0.8rem' }}>
                      {event.venue || 'No venue'} · {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                    textTransform: 'uppercase',
                    background: event.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(229,229,229,0.1)',
                    color: event.status === 'published' ? '#10b981' : '#E5E5E5',
                  }}>
                    {event.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E5E5E5' }}>{event.registrations_count || 0}</span>
                    <span style={{ color: '#888888', fontSize: '0.75rem', marginLeft: '0.3rem' }}>registered</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FCA311' }}>{event.check_ins_count || 0}</span>
                    <span style={{ color: '#888888', fontSize: '0.75rem', marginLeft: '0.3rem' }}>checked in</span>
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

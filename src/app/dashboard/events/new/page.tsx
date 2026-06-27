'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (title && !slug) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [title, slug]);

  const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, slug: slug || autoSlug, start_date: startDate, end_date: endDate,
          venue, description, status: 'draft', event_type: 'conference',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to create event');
        setSaving(false);
        return;
      }

      const eventId = data.data?.event?.id || data.event?.id || data.id;
      router.push(`/dashboard/events/${eventId}/dashboard`);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white font-sans antialiased relative">
      <nav className="hp-nav flex items-center gap-2 px-8 h-16">
        <button onClick={() => router.back()} className="bg-transparent border-none text-hp-text-secondary hover:text-white cursor-pointer text-sm transition-all duration-150">← Back</button>
        <span className="text-white/30">/</span>
        <Link href="/dashboard" className="text-hp-text-secondary hover:text-white no-underline text-sm transition-all duration-150">Events</Link>
        <span className="text-white/30">/</span>
        <span className="text-white font-medium text-sm">New Event</span>
      </nav>

      <div className="max-w-[600px] mx-auto px-6 py-10">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create New Event</h1>
        <p style={{ color: '#E5E5E5', fontSize: '0.9rem', marginBottom: '2rem' }}>Set up your event details below</p>

        <form onSubmit={handleCreate}>
          {[
            { id: 'event-title', label: 'Event Title', value: title, set: setTitle, type: 'text', placeholder: 'e.g. TechConf 2026', required: true },
            { id: 'url-slug', label: 'URL Slug', value: slug, set: setSlug, type: 'text', placeholder: 'techconf-2026' },
            { id: 'start-date', label: 'Start Date', value: startDate, set: setStartDate, type: 'datetime-local', required: true },
            { id: 'end-date', label: 'End Date', value: endDate, set: setEndDate, type: 'datetime-local', required: true },
            { id: 'venue', label: 'Venue', value: venue, set: setVenue, type: 'text', placeholder: 'e.g. Convention Center, Online' },
          ].map(f => (
            <div key={f.id} style={{ marginBottom: '1.25rem' }}>
              <label htmlFor={f.id} style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input
                id={f.id}
                aria-label={f.label}
                type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                required={f.required} placeholder={f.placeholder}
                style={{
                  width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
                  border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)',
                  color: '#fff', fontSize: '0.9rem', outline: 'none',
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="description" style={{ display: 'block', color: '#E5E5E5', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Description</label>
            <textarea
              id="description"
              aria-label="Description"
              value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Brief description of your event"
              style={{
                width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
                border: '1px solid rgba(229,229,229,0.12)', background: 'rgba(229,229,229,0.05)',
                color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.7rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>
          )}

          <button type="submit" disabled={saving || !title || !startDate || !endDate}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, var(--hp-primary), var(--hp-primary-dark))',
              color: '#000', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              opacity: saving || !title || !startDate || !endDate ? 0.5 : 1,
            }}>
            {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span> : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

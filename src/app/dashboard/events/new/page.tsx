'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (slug === '' && title) {
    setSlug(autoSlug);
  }

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
          venue, description, status: 'draft',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to create event');
        setSaving(false);
        return;
      }

      const eventId = data.event?.id || data.id;
      router.push(`/dashboard/events/${eventId}/dashboard`);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#011C40', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '1rem 2rem', borderBottom: '1px solid rgba(167,235,242,0.08)',
        background: 'rgba(2,56,89,0.6)', backdropFilter: 'blur(16px)',
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#9cb8c4', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <Link href="/dashboard" style={{ color: '#9cb8c4', textDecoration: 'none', fontSize: '0.85rem' }}>Dashboard</Link>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <span style={{ color: '#A7EBF2', fontSize: '0.85rem', fontWeight: 500 }}>New Event</span>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create New Event</h1>
        <p style={{ color: '#9cb8c4', fontSize: '0.9rem', marginBottom: '2rem' }}>Set up your event details below</p>

        <form onSubmit={handleCreate}>
          {[
            { label: 'Event Title', value: title, set: setTitle, type: 'text', placeholder: 'e.g. TechConf 2026', required: true },
            { label: 'URL Slug', value: slug, set: setSlug, type: 'text', placeholder: 'techconf-2026' },
            { label: 'Start Date', value: startDate, set: setStartDate, type: 'datetime-local', required: true },
            { label: 'End Date', value: endDate, set: setEndDate, type: 'datetime-local', required: true },
            { label: 'Venue', value: venue, set: setVenue, type: 'text', placeholder: 'e.g. Convention Center, Online' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: '#9cb8c4', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>
                {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input
                type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                required={f.required} placeholder={f.placeholder}
                style={{
                  width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
                  border: '1px solid rgba(167,235,242,0.12)', background: 'rgba(167,235,242,0.05)',
                  color: '#fff', fontSize: '0.9rem', outline: 'none',
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#9cb8c4', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Brief description of your event"
              style={{
                width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
                border: '1px solid rgba(167,235,242,0.12)', background: 'rgba(167,235,242,0.05)',
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
              background: 'linear-gradient(135deg, #54ACBF, #26658C)',
              color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              opacity: saving || !title || !startDate || !endDate ? 0.5 : 1,
            }}>
            {saving ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

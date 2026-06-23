'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  is_free: boolean;
  ticket_price: number;
  currency: string;
  status: string;
  registrations_count: number;
  session_attendance?: {
    total_registered: number;
    total_checked_in: number;
    total_checked_out: number;
    last_check_in_at: string | null;
    attendance_percentage: number;
  }[];
}

export default function SubEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    session_type: 'talk',
    start_time: '',
    end_time: '',
    max_capacity: '',
    is_free: true,
    ticket_price: 0,
    currency: 'INR',
  });
  const [saving, setSaving] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/sessions`);
      const data = await res.json();
      if (data.success) setSessions(data.data.sessions);
    } catch (e) {
      console.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Live attendance SSE
  useEffect(() => {
    const eventSource = new EventSource(`/api/events/${eventId}/attendance`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.attendance) {
          setSessions(prev => prev.map(s => {
            const live = data.attendance.find((a: { session_id: string }) => a.session_id === s.id);
            if (live) {
              return {
                ...s,
                registrations_count: live.registrations_count,
                session_attendance: [{
                  total_registered: live.total_registered,
                  total_checked_in: live.total_checked_in,
                  total_checked_out: live.total_checked_out,
                  last_check_in_at: live.last_check_in_at,
                  attendance_percentage: live.attendance_percentage,
                }],
              };
            }
            return s;
          }));
        }
      } catch (e) {}
    };
    eventSource.onerror = () => {};
    return () => eventSource.close();
  }, [eventId]);

  const resetForm = () => {
    setForm({
      title: '', description: '', session_type: 'talk', start_time: '', end_time: '',
      max_capacity: '', is_free: true, ticket_price: 0, currency: 'INR',
    });
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessions([...sessions, data.data.session]);
        setShowAdd(false);
        resetForm();
      } else {
        alert(data.error || 'Failed to add session');
      }
    } catch (e) {
      alert('Failed to add session');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessions(sessions.map(s => s.id === editingId ? { ...s, ...data.data.session } : s));
        setEditingId(null);
        resetForm();
      }
    } catch (e) {
      alert('Failed to update session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Remove this sub-event?')) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        alert(data.error || 'Cannot delete session with registrations');
      }
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const startEdit = (s: Session) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description || '',
      session_type: s.session_type,
      start_time: s.start_time.slice(0, 16),
      end_time: s.end_time.slice(0, 16),
      max_capacity: s.max_capacity?.toString() || '',
      is_free: s.is_free,
      ticket_price: s.ticket_price,
      currency: s.currency,
    });
    setShowAdd(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Sub-Events</span>
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Sub-Events</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage sessions, workshops, and talks — live attendance updates automatically
          </p>
        </div>
        <button onClick={() => { resetForm(); setEditingId(null); setShowAdd(true); }} className="hp-btn hp-btn-primary">
          + Add Sub-Event
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="hp-skeleton" style={{ height: '120px', borderRadius: '0.75rem' }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="hp-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#71717a' }}>No sub-events created yet.</p>
          <p style={{ color: '#52525b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Add sessions, workshops, or talks to organize your event.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map((s) => {
            const att = s.session_attendance?.[0];
            const pct = att?.attendance_percentage || 0;
            return (
              <div key={s.id} className="hp-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0 }}>{s.title}</h3>
                      <span className={`hp-badge ${
                        s.status === 'completed' ? 'hp-badge-success' :
                        s.status === 'ongoing' ? 'hp-badge-primary' :
                        s.status === 'cancelled' ? 'hp-badge-error' : ''
                      }`}>
                        {s.status}
                      </span>
                      <span className="hp-badge">{s.session_type}</span>
                      {!s.is_free && (
                        <span className="hp-badge hp-badge-warning">
                          {s.currency} {s.ticket_price}
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: 0 }}>
                      {formatDate(s.start_time)} — {formatDate(s.end_time)}
                    </p>

                    {/* Live attendance bar */}
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#71717a', fontSize: '0.75rem' }}>Live Attendance</span>
                        <span style={{ color: '#E5E5E5', fontSize: '0.75rem', fontWeight: 600 }}>
                          {att?.total_checked_in || 0} / {att?.total_registered || s.registrations_count || 0}
                          {s.max_capacity ? ` (cap: ${s.max_capacity})` : ''}
                          {' '}{pct.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{
                        height: '6px', borderRadius: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          width: `${Math.min(pct, 100)}%`,
                          background: 'linear-gradient(90deg, #FCA311, #FCD34D)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <span style={{ color: '#71717a', fontSize: '0.7rem' }}>
                          ✓ {att?.total_checked_in || 0} checked in
                        </span>
                        <span style={{ color: '#71717a', fontSize: '0.7rem' }}>
                          ↗ {att?.total_checked_out || 0} checked out
                        </span>
                        {att?.last_check_in_at && (
                          <span style={{ color: '#52525b', fontSize: '0.7rem' }}>
                            Last scan: {formatDate(att.last_check_in_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                    <button onClick={() => startEdit(s)} className="hp-btn hp-btn-ghost" style={{ fontSize: '0.8rem' }}>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="hp-btn hp-btn-ghost"
                      style={{ fontSize: '0.8rem', color: '#ef4444' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div className="hp-glass" style={{ padding: '2rem', width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>
              {editingId ? 'Edit Sub-Event' : 'Add Sub-Event'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Title *</label>
                <input className="hp-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Session title" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Description</label>
                <textarea className="hp-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" rows={2} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Type</label>
                  <select className="hp-input" value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}>
                    <option value="talk">Talk</option>
                    <option value="workshop">Workshop</option>
                    <option value="panel">Panel</option>
                    <option value="competition">Competition</option>
                    <option value="networking">Networking</option>
                    <option value="break">Break</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Capacity</label>
                  <input className="hp-input" type="number" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} placeholder="Unlimited" min="1" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Start Time *</label>
                  <input className="hp-input" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>End Time *</label>
                  <input className="hp-input" type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>

              {/* Sub-event pricing */}
              <div className="hp-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Paid sub-event?</span>
                  <button
                    onClick={() => setForm({ ...form, is_free: !form.is_free })}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: form.is_free ? '#27272a' : '#FCA311',
                      border: 'none', cursor: 'pointer', position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#fff', position: 'absolute', top: '3px',
                      left: form.is_free ? '3px' : '23px', transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
                {!form.is_free && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <select className="hp-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={{ width: '80px' }}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                    <input className="hp-input" type="number" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: parseFloat(e.target.value) || 0 })} min="0" step="0.01" placeholder="0.00" />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="hp-btn hp-btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="hp-btn hp-btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !form.title || !form.start_time || !form.end_time}
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Sub-Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

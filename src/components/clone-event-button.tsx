'use client';

import { useState } from 'react';

interface CloneEventButtonProps {
  eventId: string;
  onCloned?: (newEventId: string) => void;
}

export default function CloneEventButton({ eventId, onCloned }: CloneEventButtonProps) {
  const [cloning, setCloning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClone = async () => {
    setCloning(true);
    try {
      const res = await fetch(`/api/events/${eventId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        onCloned?.(json.data.event.id);
        window.location.href = `/dashboard/events/${json.data.event.id}/dashboard`;
      } else {
        alert(json.error || 'Failed to clone event');
      }
    } catch {
      alert('Failed to clone event');
    } finally {
      setCloning(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="hp-btn hp-btn-secondary"
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        Clone Event
      </button>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="hp-glass-card"
            style={{
              padding: '2rem',
              borderRadius: '1rem',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Clone Event</h3>
            <p style={{ margin: '0 0 1.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
              This will create a draft copy of this event including sessions, forms, tickets, gates, and settings. Registration data will not be copied.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                className="hp-btn"
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={cloning}
                className="hp-btn hp-btn-primary"
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: cloning ? 'not-allowed' : 'pointer' }}
              >
                {cloning ? 'Cloning...' : 'Clone Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CloneEventButton from '@/components/clone-event-button';

interface Ticket {
  id: string;
  ticket_number: string;
  status: string;
  qr_version: number;
  qr_last_rotated_at: string | null;
  qr_rotation_count: number;
  has_active_qr: boolean;
  qr_expires_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  registration: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface QRData {
  qr_data_url: string;
  qr_string: string;
  expires_at: string;
  version: number;
}

export default function EventTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0, cancelled: 0, fraud: 0 });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const [ticketsRes, statsRes, fraudRes] = await Promise.all([
        fetch(`/api/events/${eventId}/tickets`),
        fetch(`/api/events/${eventId}/stats`),
        fetch(`/api/events/${eventId}/fraud`),
      ]);

      const ticketsData = await ticketsRes.json();
      if (ticketsData.success) setTickets(ticketsData.data);

      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats({
          total: statsData.data.tickets.total_tickets,
          active: statsData.data.tickets.active_tickets,
          used: statsData.data.tickets.used_tickets,
          cancelled: statsData.data.tickets.cancelled_tickets,
          fraud: 0,
        });
      }

      const fraudData = await fraudRes.json();
      if (fraudData.success) {
        setStats(s => ({ ...s, fraud: fraudData.data.fraud_suspected }));
      }
    } catch (e) {
      console.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const loadQR = async (ticketId: string) => {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) setQrData(data.data);
    } catch (e) {
      alert('Failed to load QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const rotateQR = async (ticketId: string) => {
    if (!confirm('Rotate QR? The old QR code will stop working.')) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/rotate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setQrData(data.data);
        setTickets(tickets.map(t => t.id === ticketId ? {
          ...t,
          qr_version: t.qr_version + 1,
          qr_rotation_count: t.qr_rotation_count + 1,
          qr_last_rotated_at: new Date().toISOString(),
        } : t));
      }
    } catch (e) {
      alert('Failed to rotate QR');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#9cb8c4', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#9cb8c4', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Tickets</span>
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Tickets & QR</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            HMAC-signed QR codes with rotation and replay detection
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <CloneEventButton eventId={eventId} />
          <button onClick={() => setShowScanner(!showScanner)} className="hp-btn hp-btn-primary">
            {showScanner ? 'Close Scanner' : 'Open Scanner'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#fff' },
          { label: 'Active', value: stats.active, color: '#54ACBF' },
          { label: 'Checked In', value: stats.used, color: '#10b981' },
          { label: 'Cancelled', value: stats.cancelled, color: '#ef4444' },
          { label: 'Fraud Flags', value: stats.fraud, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="hp-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: '#71717a', fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* QR Preview Modal */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
          onClick={() => { setSelectedTicket(null); setQrData(null); }}
        >
          <div className="hp-glass" style={{ padding: '2rem', width: '480px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Secure QR Ticket</h2>
              <button onClick={() => { setSelectedTicket(null); setQrData(null); }} className="hp-btn hp-btn-ghost">✕</button>
            </div>

            {/* Ticket Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              borderRadius: '1rem', padding: '1.5rem',
              border: '1px solid rgba(84, 172, 191, 0.3)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ color: '#A7EBF2', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  Heypass Secure Ticket
                </div>
                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  {selectedTicket.ticket_number}
                </div>
              </div>

              {/* QR Code */}
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                {qrLoading ? (
                  <div className="hp-skeleton" style={{ width: '180px', height: '180px', borderRadius: '0.75rem', margin: '0 auto' }} />
                ) : qrData ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={qrData.qr_data_url}
                      alt="Secure QR Code"
                      style={{ width: '180px', height: '180px', borderRadius: '0.5rem', background: '#fff', padding: '0.5rem' }}
                    />
                    {/* Expiry indicator */}
                    <div style={{
                      position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)',
                      padding: '0.15rem 0.5rem', borderRadius: '0.75rem',
                      background: new Date(qrData.expires_at) > new Date() ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                      color: '#fff', fontSize: '0.6rem', whiteSpace: 'nowrap',
                    }}>
                      {new Date(qrData.expires_at) > new Date()
                        ? `Expires ${new Date(qrData.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                        : 'EXPIRED'}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => loadQR(selectedTicket.id)} className="hp-btn hp-btn-secondary">
                    Load QR Code
                  </button>
                )}
              </div>

              {/* Security info */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem',
                fontSize: '0.7rem', marginTop: '1rem',
              }}>
                <div>
                  <span style={{ color: '#71717a' }}>QR Version: </span>
                  <span style={{ color: '#A7EBF2', fontFamily: 'var(--font-jetbrains)' }}>v{selectedTicket.qr_version}</span>
                </div>
                <div>
                  <span style={{ color: '#71717a' }}>Rotations: </span>
                  <span style={{ color: '#A7EBF2' }}>{selectedTicket.qr_rotation_count}</span>
                </div>
                <div>
                  <span style={{ color: '#71717a' }}>Status: </span>
                  <span style={{ color: selectedTicket.status === 'active' ? '#10b981' : '#ef4444' }}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#71717a' }}>HMAC: </span>
                  <span style={{ color: '#10b981' }}>✓ Signed</span>
                </div>
              </div>

              {/* Attendee */}
              {selectedTicket.registration && (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                    {selectedTicket.registration.first_name} {selectedTicket.registration.last_name}
                  </div>
                  <div style={{ color: '#71717a', fontSize: '0.75rem' }}>
                    {selectedTicket.registration.email}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => selectedTicket && rotateQR(selectedTicket.id)}
                className="hp-btn hp-btn-secondary"
                style={{ flex: 1 }}
                disabled={!selectedTicket}
              >
                Rotate QR
              </button>
              <button
                onClick={() => {
                  if (qrData) {
                    const link = document.createElement('a');
                    link.href = qrData.qr_data_url;
                    link.download = `ticket-${selectedTicket?.ticket_number}-v${selectedTicket?.qr_version}.png`;
                    link.click();
                  }
                }}
                className="hp-btn hp-btn-secondary"
                style={{ flex: 1 }}
                disabled={!qrData}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="hp-skeleton" style={{ height: '72px', borderRadius: '0.75rem' }} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="hp-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#71717a' }}>No tickets generated yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
            padding: '0.5rem 1rem', fontSize: '0.7rem', color: '#71717a',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div>Ticket</div>
            <div>Attendee</div>
            <div>Status</div>
            <div>QR Version</div>
            <div>QR Active</div>
            <div>Rotations</div>
            <div></div>
          </div>

          {tickets.map((t) => (
            <div
              key={t.id}
              className="hp-card"
              style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              onClick={() => { setSelectedTicket(t); loadQR(t.id); }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-jetbrains)', color: '#fff', fontSize: '0.85rem' }}>
                  {t.ticket_number}
                </div>
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>
                  {t.registration ? `${t.registration.first_name} ${t.registration.last_name}` : '—'}
                </div>
                <div>
                  <span className={`hp-badge ${
                    t.status === 'active' ? 'hp-badge-success' :
                    t.status === 'used' ? 'hp-badge-primary' :
                    t.status === 'cancelled' ? 'hp-badge-error' : ''
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div style={{ color: '#A7EBF2', fontFamily: 'var(--font-jetbrains)', fontSize: '0.8rem' }}>
                  v{t.qr_version}
                </div>
                <div>
                  {t.has_active_qr ? (
                    <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Active</span>
                  ) : (
                    <span style={{ color: '#71717a', fontSize: '0.8rem' }}>✗ None</span>
                  )}
                </div>
                <div style={{ color: '#71717a', fontSize: '0.8rem' }}>
                  {t.qr_rotation_count}
                </div>
                <div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); loadQR(t.id); }}
                    className="hp-btn hp-btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    View QR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

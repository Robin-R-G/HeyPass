'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import CloneEventButton from '@/components/clone-event-button';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EventNav } from '@/components/event-nav';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { DashboardShell } from '@/components/dashboard-shell';
import { X, Download, RotateCw, Shield } from 'lucide-react';

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
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0, cancelled: 0, fraud: 0 });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [confirmRotateQR, setConfirmRotateQR] = useState<string | null>(null);

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

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const loadQR = async (ticketId: string) => {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) setQrData(data.data);
    } catch {
      toast('Failed to load QR code', 'error');
    } finally {
      setQrLoading(false);
    }
  };

  const executeRotateQR = async (ticketId: string) => {
    setConfirmRotateQR(null);
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
    } catch {
      toast('Failed to rotate QR', 'error');
    }
  };

  const downloadQR = () => {
    if (qrData && selectedTicket) {
      const link = document.createElement('a');
      link.href = qrData.qr_data_url;
      link.download = `ticket-${selectedTicket.ticket_number}-v${selectedTicket.qr_version}.png`;
      link.click();
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-8">
        <EventNav eventId={eventId} active="tickets" />

        {/* Page Header */}
        <div className="hp-page-header">
          <div>
            <h1 className="hp-page-title">Tickets & QR</h1>
            <p className="hp-page-subtitle">HMAC-signed QR codes with rotation and replay detection</p>
          </div>
          <div className="flex items-center gap-3">
            <CloneEventButton eventId={eventId} />
            <Button onClick={() => setShowScanner(!showScanner)}>
              {showScanner ? 'Close Scanner' : 'Open Scanner'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-[var(--hp-text)]' },
            { label: 'Active', value: stats.active, color: 'text-[var(--hp-primary)]' },
            { label: 'Checked In', value: stats.used, color: 'text-[var(--hp-success)]' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-[var(--hp-error)]' },
            { label: 'Fraud Flags', value: stats.fraud, color: 'text-[var(--hp-warning)]' },
          ].map((s) => (
            <div key={s.label} className="hp-kpi text-center">
              <div className={`hp-kpi-value ${s.color}`}>{s.value}</div>
              <div className="hp-kpi-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* QR Preview Modal */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-[var(--hp-z-modal)] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            onClick={() => { setSelectedTicket(null); setQrData(null); }}
          >
            <div
              className="w-full max-w-[480px] bg-[var(--hp-bg-elevated)] border border-[var(--hp-border)] rounded-[var(--hp-radius-xl)] shadow-[var(--hp-shadow-xl)] p-6 animate-[hp-modal-in_0.25s_var(--hp-ease-spring)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-[var(--hp-text)]">Secure QR Ticket</h2>
                <button
                  onClick={() => { setSelectedTicket(null); setQrData(null); }}
                  className="p-1.5 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface-hover)] rounded-[var(--hp-radius-sm)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Ticket Card */}
              <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-[var(--hp-radius-lg)] p-5 border border-[var(--hp-accent)]/20">
                {/* Ticket Header */}
                <div className="text-center mb-4">
                  <div className="text-[var(--hp-text-muted)] text-[10px] uppercase tracking-[0.15em] font-medium">HeyPass Secure Ticket</div>
                  <div className="text-white text-lg font-bold mt-1 font-[var(--hp-font-mono)]">{selectedTicket.ticket_number}</div>
                </div>

                {/* QR Code */}
                <div className="text-center mb-4">
                  {qrLoading ? (
                    <div className="hp-skeleton w-[180px] h-[180px] rounded-[var(--hp-radius-md)] mx-auto" />
                  ) : qrData ? (
                    <div className="relative inline-block">
                      <img
                        src={qrData.qr_data_url}
                        alt="Secure QR Code"
                        className="w-[180px] h-[180px] rounded-[var(--hp-radius-sm)] bg-white p-2"
                      />
                      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-[var(--hp-radius-full)] text-white text-[10px] font-medium whitespace-nowrap ${
                        new Date(qrData.expires_at) > new Date()
                          ? 'bg-[var(--hp-success)]'
                          : 'bg-[var(--hp-error)]'
                      }`}>
                        {new Date(qrData.expires_at) > new Date()
                          ? `Expires ${new Date(qrData.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                          : 'EXPIRED'}
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => loadQR(selectedTicket.id)} variant="secondary">
                      Load QR Code
                    </Button>
                  )}
                </div>

                {/* Security Info Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-black/30 rounded-[var(--hp-radius-sm)] text-[11px] mt-4">
                  <div>
                    <span className="text-[var(--hp-text-muted)]">QR Version: </span>
                    <span className="text-[var(--hp-text)] font-[var(--hp-font-mono)]">v{selectedTicket.qr_version}</span>
                  </div>
                  <div>
                    <span className="text-[var(--hp-text-muted)]">Rotations: </span>
                    <span className="text-[var(--hp-text)]">{selectedTicket.qr_rotation_count}</span>
                  </div>
                  <div>
                    <span className="text-[var(--hp-text-muted)]">Status: </span>
                    <span className={selectedTicket.status === 'active' ? 'text-[var(--hp-success)]' : 'text-[var(--hp-error)]'}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--hp-text-muted)]">HMAC: </span>
                    <span className="text-[var(--hp-success)]">Signed</span>
                  </div>
                </div>

                {/* Attendee */}
                {selectedTicket.registration && (
                  <div className="mt-3 text-center">
                    <div className="text-white font-medium text-sm">
                      {selectedTicket.registration.first_name} {selectedTicket.registration.last_name}
                    </div>
                    <div className="text-[var(--hp-text-muted)] text-xs mt-0.5">
                      {selectedTicket.registration.email}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-5">
                <Button
                  onClick={() => setConfirmRotateQR(selectedTicket?.id || null)}
                  variant="secondary"
                  className="flex-1"
                  disabled={!selectedTicket}
                >
                  <RotateCw size={14} />
                  Rotate QR
                </Button>
                <Button
                  onClick={downloadQR}
                  variant="secondary"
                  className="flex-1"
                  disabled={!qrData}
                >
                  <Download size={14} />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="hp-skeleton h-[72px] rounded-[var(--hp-radius-lg)]" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No tickets generated yet"
            description="Tickets will appear here once attendees register for this event."
          />
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] px-4 py-2.5 text-[10px] font-semibold text-[var(--hp-text-muted)] uppercase tracking-wider">
              <div>Ticket</div>
              <div>Attendee</div>
              <div>Status</div>
              <div>QR Version</div>
              <div>QR Active</div>
              <div>Rotations</div>
              <div />
            </div>

            {tickets.map((t) => (
              <div
                key={t.id}
                className="hp-card p-4 cursor-pointer group"
                onClick={() => { setSelectedTicket(t); loadQR(t.id); }}
              >
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-2">
                  <div className="font-[var(--hp-font-mono)] text-[var(--hp-text)] text-sm font-medium group-hover:text-[var(--hp-primary)] transition-colors">
                    {t.ticket_number}
                  </div>
                  <div className="text-[var(--hp-text-muted)] text-sm truncate">
                    {t.registration ? `${t.registration.first_name} ${t.registration.last_name}` : '—'}
                  </div>
                  <div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="font-[var(--hp-font-mono)] text-[var(--hp-text)] text-sm">
                    v{t.qr_version}
                  </div>
                  <div>
                    {t.has_active_qr ? (
                      <span className="text-[var(--hp-success)] text-sm font-medium">Active</span>
                    ) : (
                      <span className="text-[var(--hp-text-muted)] text-sm">None</span>
                    )}
                  </div>
                  <div className="text-[var(--hp-text-muted)] text-sm">
                    {t.qr_rotation_count}
                  </div>
                  <div>
                    <Button
                      onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); loadQR(t.id); }}
                      variant="ghost"
                      size="sm"
                    >
                      View QR
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmModal
          open={confirmRotateQR !== null}
          title="Rotate QR Code"
          message="Rotate QR? The old QR code will stop working."
          confirmLabel="Rotate"
          variant="warning"
          onConfirm={() => confirmRotateQR && executeRotateQR(confirmRotateQR)}
          onCancel={() => setConfirmRotateQR(null)}
        />
      </div>
    </DashboardShell>
  );
}

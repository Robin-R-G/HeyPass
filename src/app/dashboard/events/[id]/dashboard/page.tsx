'use client';

import { useState, useEffect, useCallback, use } from 'react';
import CloneEventButton from '@/components/clone-event-button';
import { EventNav } from '@/components/event-nav';

interface DashboardData {
  total_registered: number;
  total_checked_in: number;
  total_checked_out: number;
  currently_inside: number;
  check_in_rate: number;
  avg_duration_minutes: number;
  peak_hour: string;
  gate_breakdown: {
    gate_id: string;
    gate_name: string;
    gate_type: string;
    total_scans: number;
    checkins: number;
    checkouts: number;
    duplicates_blocked: number;
    fraud_suspected: number;
    is_active: boolean;
    active_staff: number;
    last_scan_at: string | null;
  }[];
  hourly_distribution: { hour: number; checkins: number; checkouts: number }[];
  session_breakdown: {
    session_id: string;
    session_title: string;
    start_time: string;
    end_time: string;
    status: string;
    total_registered: number;
    total_checked_in: number;
    total_checked_out: number;
    attendance_percentage: number;
  }[];
}

export default function AttendanceDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshing, setAutoRefreshing] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/dashboard`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefreshing) return;
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [autoRefreshing, fetchDashboard]);

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Event Navigation */}
      <EventNav eventId={eventId} active="dashboard" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Attendance Dashboard</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-time attendance across all gates and sessions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setAutoRefreshing(!autoRefreshing)}
            className={`hp-btn ${autoRefreshing ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            {autoRefreshing ? '● Live' : '○ Paused'}
          </button>
          <button onClick={fetchDashboard} className="hp-btn hp-btn-secondary" style={{ fontSize: '0.8rem' }}>
            Refresh
          </button>
          <CloneEventButton eventId={eventId} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="hp-skeleton" style={{ height: '100px', borderRadius: '0.75rem' }} />)}
        </div>
      ) : data && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Registered', value: data.total_registered, color: '#fff' },
              { label: 'Checked In', value: data.total_checked_in, color: 'var(--hp-primary)' },
              { label: 'Checked Out', value: data.total_checked_out, color: '#a1a1aa' },
              { label: 'Inside Now', value: data.currently_inside, color: '#10b981' },
              { label: 'Check-in Rate', value: `${data.check_in_rate}%`, color: '#E5E5E5' },
              { label: 'Avg Duration', value: formatDuration(data.avg_duration_minutes), color: '#f59e0b' },
            ].map((kpi) => (
              <div key={kpi.label} className="hp-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ color: '#71717a', fontSize: '0.7rem' }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Gate Breakdown */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Gate Breakdown</h2>
            {data.gate_breakdown.length === 0 ? (
              <div className="hp-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#71717a', fontSize: '0.85rem' }}>No gates configured.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {data.gate_breakdown.map((gate) => (
                  <div key={gate.gate_id} className="hp-card" style={{ borderLeft: `3px solid ${gate.is_active ? 'var(--hp-primary)' : '#52525b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{gate.gate_name}</div>
                        <div style={{ color: '#71717a', fontSize: '0.75rem' }}>{gate.gate_type} • {gate.active_staff} staff</div>
                      </div>
                      <span className={`hp-badge ${gate.is_active ? 'hp-badge-success' : 'hp-badge-warning'}`}>
                        {gate.is_active ? 'Live' : 'Off'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Check-ins / Check-outs</span>
                        <span style={{ color: '#E5E5E5', fontSize: '0.7rem', fontWeight: 600 }}>{gate.checkins}</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          width: `${Math.min((gate.checkins / Math.max(data.total_registered, 1)) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, var(--hp-primary), var(--hp-primary-dark))',
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: '#71717a' }}>Total</span>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{gate.total_scans}</div>
                      </div>
                      <div>
                        <span style={{ color: '#71717a' }}>Blocked</span>
                        <div style={{ color: '#f59e0b', fontWeight: 600 }}>{gate.duplicates_blocked}</div>
                      </div>
                      <div>
                        <span style={{ color: '#71717a' }}>Fraud</span>
                        <div style={{ color: '#ef4444', fontWeight: 600 }}>{gate.fraud_suspected}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Breakdown */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Session Attendance</h2>
            {data.session_breakdown.length === 0 ? (
              <div className="hp-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#71717a', fontSize: '0.85rem' }}>No sessions with attendance data.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.session_breakdown.map((s) => (
                  <div key={s.session_id} className="hp-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', margin: 0 }}>{s.session_title}</h3>
                          <span className={`hp-badge ${s.status === 'completed' ? 'hp-badge-success' : s.status === 'ongoing' ? 'hp-badge-primary' : ''}`}>
                            {s.status}
                          </span>
                        </div>

                        {/* Attendance bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>
                            {s.total_checked_in} / {s.total_registered} checked in
                          </span>
                          <span style={{ color: '#E5E5E5', fontSize: '0.7rem', fontWeight: 600 }}>
                            {s.attendance_percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            width: `${Math.min(s.attendance_percentage, 100)}%`,
                            background: s.attendance_percentage >= 80 ? '#10b981' : s.attendance_percentage >= 50 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hourly Distribution */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>
              Hourly Distribution (Peak: {data.peak_hour})
            </h2>
            <div className="hp-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
                {data.hourly_distribution.map((h) => {
                  const maxCheckins = Math.max(...data.hourly_distribution.map(x => x.checkins), 1);
                  const height = (h.checkins / maxCheckins) * 100;
                  return (
                    <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        title={`${String(h.hour).padStart(2, '0')}:00 — ${h.checkins} check-ins`}
                        style={{
                          width: '100%', height: `${Math.max(height, 2)}%`,
                          background: h.checkins > 0 ? 'linear-gradient(180deg, var(--hp-primary), var(--hp-primary-dark))' : 'transparent',
                          borderRadius: '2px 2px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      {h.hour % 3 === 0 && (
                        <span style={{ color: '#52525b', fontSize: '0.55rem', marginTop: '0.25rem' }}>
                          {String(h.hour).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

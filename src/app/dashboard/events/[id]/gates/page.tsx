'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/toast';

interface Gate {
  id: string;
  name: string;
  location: string | null;
  gate_type: string;
  is_active: boolean;
  max_scans_per_min: number;
  last_ping_at: string | null;
  assigned_sessions: string[];
  auto_checkout_enabled: boolean;
  total_scans?: number;
  successful_checkins?: number;
  duplicates_blocked?: number;
  fraud_suspected?: number;
  active_staff?: number;
}

const GATE_TYPES = [
  { value: 'main_entrance', label: 'Main Entrance', icon: '🚪' },
  { value: 'session_gate', label: 'Session Gate', icon: '🎫' },
  { value: 'exit_gate', label: 'Exit Gate', icon: '🏃' },
  { value: 'vip_lane', label: 'VIP Lane', icon: '⭐' },
];

export default function GatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', gate_type: 'main_entrance', max_scans_per_min: '60' });
  const [saving, setSaving] = useState(false);

  const fetchGates = useCallback(async () => {
    try {
      const [gatesRes, statsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/gates`),
        fetch(`/api/events/${eventId}/gates`).then(r => r.json()),
      ]);

      const gatesData = await gatesRes.json();
      if (gatesData.success) setGates(gatesData.data);
    } catch (e) {
      console.error('Failed to load gates');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchGates(); }, [fetchGates]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/gates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_scans_per_min: parseInt(form.max_scans_per_min) || 60,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGates([...gates, data.data]);
        setShowAdd(false);
        setForm({ name: '', location: '', gate_type: 'main_entrance', max_scans_per_min: '60' });
      }
    } catch (e) {
      toast('Failed to create gate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (gateId: string) => {
    try {
      const res = await fetch(`/api/gates/${gateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !gates.find(g => g.id === gateId)?.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setGates(gates.map(g => g.id === gateId ? { ...g, is_active: !g.is_active } : g));
      }
    } catch (e) {
      toast('Failed to toggle gate', 'error');
    }
  };

  const handleDelete = async (gateId: string) => {
    if (!confirm('Delete this gate?')) return;
    try {
      const res = await fetch(`/api/gates/${gateId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setGates(gates.filter(g => g.id !== gateId));
    } catch (e) {
      toast('Failed to delete gate', 'error');
    }
  };

  const getGateInfo = (type: string) => GATE_TYPES.find(t => t.value === type) || GATE_TYPES[0];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Gates</span>
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Gates</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage entry gates, assign staff, and track per-gate attendance
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="hp-btn hp-btn-primary">+ Add Gate</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="hp-skeleton" style={{ height: '120px', borderRadius: '0.75rem' }} />)}
        </div>
      ) : gates.length === 0 ? (
        <div className="hp-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#71717a' }}>No gates created yet.</p>
          <p style={{ color: '#52525b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Add gates to track entry/exit at different locations.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {gates.map((gate) => {
            const info = getGateInfo(gate.gate_type);
            return (
              <div key={gate.id} className={`hp-card ${gate.is_active ? '' : ''}`} style={{ opacity: gate.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '0.75rem',
                      background: gate.is_active ? 'rgba(84, 172, 191, 0.15)' : 'rgba(113, 113, 122, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                    }}>
                      {info.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0 }}>{gate.name}</h3>
                        <span className={`hp-badge ${gate.is_active ? 'hp-badge-success' : 'hp-badge-warning'}`}>
                          {gate.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="hp-badge">{info.label}</span>
                      </div>
                      {gate.location && (
                        <p style={{ color: '#71717a', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>📍 {gate.location}</p>
                      )}

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                        <div>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Scans</span>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{gate.total_scans || 0}</div>
                        </div>
                        <div>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Check-ins</span>
                          <div style={{ color: '#10b981', fontWeight: 600 }}>{gate.successful_checkins || 0}</div>
                        </div>
                        <div>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Duplicates Blocked</span>
                          <div style={{ color: '#f59e0b', fontWeight: 600 }}>{gate.duplicates_blocked || 0}</div>
                        </div>
                        <div>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Fraud</span>
                          <div style={{ color: '#ef4444', fontWeight: 600 }}>{gate.fraud_suspected || 0}</div>
                        </div>
                        <div>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Staff</span>
                          <div style={{ color: '#E5E5E5', fontWeight: 600 }}>{gate.active_staff || 0}</div>
                        </div>
                        <div>
                          <span style={{ color: '#71717a', fontSize: '0.7rem' }}>Rate Limit</span>
                          <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{gate.max_scans_per_min}/min</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleToggle(gate.id)} className="hp-btn hp-btn-ghost" style={{ fontSize: '0.8rem' }}>
                      {gate.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <a href={`/dashboard/events/${eventId}/scanner?gate=${gate.id}`} className="hp-btn hp-btn-secondary" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
                      Open Scanner
                    </a>
                    <button onClick={() => handleDelete(gate.id)} className="hp-btn hp-btn-ghost" style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div className="hp-glass" style={{ padding: '2rem', width: '480px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>Add Gate</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Gate Name *</label>
                <input className="hp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Entrance, Gate A" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Location</label>
                <input className="hp-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Building entrance, Room 101, etc." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Gate Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {GATE_TYPES.map(gt => (
                    <button
                      key={gt.value}
                      onClick={() => setForm({ ...form, gate_type: gt.value })}
                      className={`hp-btn ${form.gate_type === gt.value ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
                      style={{ fontSize: '0.8rem', justifyContent: 'flex-start', gap: '0.5rem' }}
                    >
                      {gt.icon} {gt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Max Scans/Minute</label>
                <input className="hp-input" type="number" value={form.max_scans_per_min} onChange={(e) => setForm({ ...form, max_scans_per_min: e.target.value })} min="10" max="200" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowAdd(false)} className="hp-btn hp-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleAdd} className="hp-btn hp-btn-primary" style={{ flex: 1 }} disabled={saving || !form.name}>
                {saving ? 'Creating...' : 'Create Gate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

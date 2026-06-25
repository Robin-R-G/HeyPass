'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface Gate {
  id: string;
  name: string;
  gate_type: string;
}

interface GateStaffMember {
  id: string;
  gate_id: string;
  staff_id: string;
  role: string;
  is_active: boolean;
  shift_start: string | null;
  shift_end: string | null;
  staff_name: string;
  staff_email: string;
}

interface StaffPerf {
  staff_id: string;
  staff_name: string;
  gate_name: string;
  total_scans: number;
  checkins: number;
  checkouts: number;
  first_scan: string | null;
  last_scan: string | null;
}

export default function StaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [gates, setGates] = useState<Gate[]>([]);
  const [allStaff, setAllStaff] = useState<GateStaffMember[]>([]);
  const [performance, setPerformance] = useState<StaffPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ gate_id: '', staff_id: '', role: 'scanner' });
  const [saving, setSaving] = useState(false);
  const [confirmRemoveStaff, setConfirmRemoveStaff] = useState<{gateId: string; staffId: string} | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [gatesRes, perfRes] = await Promise.all([
        fetch(`/api/events/${eventId}/gates`),
        fetch(`/api/events/${eventId}/staff-performance`),
      ]);

      const gatesData = await gatesRes.json();
      if (gatesData.success) setGates(gatesData.data);

      const perfData = await perfRes.json();
      if (perfData.success) setPerformance(perfData.data);

      // Fetch staff for each gate
      const staffPromises = (gatesData.data || []).map((g: Gate) =>
        fetch(`/api/gates/${g.id}/staff`).then(r => r.json())
      );
      const staffResults = await Promise.all(staffPromises);
      const allStaffData = staffResults.flatMap((r: { data?: GateStaffMember[] }) => r.data || []);
      setAllStaff(allStaffData);
    } catch (e) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/gates/${assignForm.gate_id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: assignForm.staff_id, role: assignForm.role }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssign(false);
        fetchData();
      } else {
        toast(data.error || 'Failed to assign staff', 'error');
      }
    } catch (e) {
      toast('Failed to assign staff', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeRemoveStaff = async () => {
    if (!confirmRemoveStaff) return;
    const { gateId, staffId } = confirmRemoveStaff;
    setConfirmRemoveStaff(null);
    try {
      await fetch(`/api/gates/${gateId}/staff`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId }),
      });
      fetchData();
    } catch (e) {
      toast('Failed to remove staff', 'error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Staff</span>
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Staff Management</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Assign staff to gates and track scan performance
          </p>
        </div>
        <button onClick={() => setShowAssign(true)} className="hp-btn hp-btn-primary" disabled={gates.length === 0}>
          + Assign Staff
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="hp-skeleton" style={{ height: '80px', borderRadius: '0.75rem' }} />)}
        </div>
      ) : (
        <>
          {/* Staff Assignments */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Active Assignments</h2>
            {allStaff.length === 0 ? (
              <div className="hp-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#71717a', fontSize: '0.85rem' }}>No staff assigned to any gate yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allStaff.map((s) => {
                  const gate = gates.find(g => g.id === s.gate_id);
                  return (
                    <div key={s.id} className="hp-card" style={{ padding: '0.75rem 1rem', opacity: s.is_active ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(84, 172, 191, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', color: '#E5E5E5',
                          }}>
                            {s.staff_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>{s.staff_name}</div>
                            <div style={{ color: '#71717a', fontSize: '0.75rem' }}>{s.staff_email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Gate: {gate?.name || 'Unknown'}</div>
                            <div style={{ color: '#71717a', fontSize: '0.7rem' }}>Role: {s.role}</div>
                          </div>
                          <span className={`hp-badge ${s.is_active ? 'hp-badge-success' : 'hp-badge-warning'}`}>
                            {s.is_active ? 'Active' : 'Off Duty'}
                          </span>
                          <button
                            onClick={() => setConfirmRemoveStaff({gateId: s.gate_id, staffId: s.staff_id})}
                            className="hp-btn hp-btn-ghost"
                            style={{ fontSize: '0.75rem', color: '#ef4444' }}
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
          </div>

          {/* Staff Performance */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Scan Performance</h2>
            {performance.length === 0 ? (
              <div className="hp-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#71717a', fontSize: '0.85rem' }}>No scan data yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {performance.map((p, i) => (
                  <div key={`${p.staff_id}-${i}`} className="hp-card" style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 500 }}>{p.staff_name}</div>
                        <div style={{ color: '#71717a', fontSize: '0.75rem' }}>Gate: {p.gate_name}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>{p.total_scans}</div>
                          <div style={{ color: '#71717a', fontSize: '0.65rem' }}>Total</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#10b981', fontWeight: 600 }}>{p.checkins}</div>
                          <div style={{ color: '#71717a', fontSize: '0.65rem' }}>In</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#f59e0b', fontWeight: 600 }}>{p.checkouts}</div>
                          <div style={{ color: '#71717a', fontSize: '0.65rem' }}>Out</div>
                        </div>
                        <div style={{ color: '#52525b', fontSize: '0.65rem' }}>
                          {p.first_scan ? `${new Date(p.first_scan).toLocaleTimeString()} — ${p.last_scan ? new Date(p.last_scan).toLocaleTimeString() : ''}` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div className="hp-glass" style={{ padding: '2rem', width: '420px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>Assign Staff to Gate</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Gate *</label>
                <select className="hp-input" value={assignForm.gate_id} onChange={(e) => setAssignForm({ ...assignForm, gate_id: e.target.value })}>
                  <option value="">Select gate</option>
                  {gates.filter(g => g.id).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Staff User ID *</label>
                <input className="hp-input" value={assignForm.staff_id} onChange={(e) => setAssignForm({ ...assignForm, staff_id: e.target.value })} placeholder="User UUID" />
                <p style={{ color: '#52525b', fontSize: '0.7rem', marginTop: '0.25rem' }}>Must be a member of this organization</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Role</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['scanner', 'supervisor', 'admin'].map(r => (
                    <button
                      key={r}
                      onClick={() => setAssignForm({ ...assignForm, role: r })}
                      className={`hp-btn ${assignForm.role === r ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
                      style={{ flex: 1, fontSize: '0.8rem', textTransform: 'capitalize' }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowAssign(false)} className="hp-btn hp-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleAssign} className="hp-btn hp-btn-primary" style={{ flex: 1 }} disabled={saving || !assignForm.gate_id || !assignForm.staff_id}>
                {saving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmRemoveStaff !== null}
        title="Remove Staff"
        message="Remove staff from this gate?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={executeRemoveStaff}
        onCancel={() => setConfirmRemoveStaff(null)}
      />
    </div>
  );
}

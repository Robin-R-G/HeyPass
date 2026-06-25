'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/toast';

interface ManualCert {
  id: string;
  certificate_number: string;
  access_token: string;
  is_manual: boolean;
  manual_data: Record<string, string>;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  type_id: string;
}

interface CertType {
  id: string;
  name: string;
  slug: string;
}

export default function EventCertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [certs, setCerts] = useState<ManualCert[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showPreview, setShowPreview] = useState<ManualCert | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    template_id: '',
    type_id: '',
    event_title: '',
    event_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, generated: 0, delivered: 0, downloaded: 0, revoked: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [certsRes, templatesRes, statsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/certificates`),
        fetch(`/api/form-templates`),
        fetch(`/api/events/${eventId}/stats`),
      ]);

      const certsData = await certsRes.json();
      if (certsData.success) setCerts(certsData.data);

      const templatesData = await templatesRes.json();
      if (templatesData.success) setTemplates(templatesData.data?.templates || []);

      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data.certificates);
    } catch (e) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCerts([data.data, ...certs]);
        setShowAdd(false);
        setForm({ name: '', email: '', template_id: '', type_id: '', event_title: '', event_date: '' });
        setStats(s => ({ ...s, total: s.total + 1, generated: s.generated + 1 }));
      } else {
        toast(data.error || 'Failed to create certificate', 'error');
      }
    } catch (e) {
      toast('Failed to create certificate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (certId: string) => {
    const reason = prompt('Reason for revocation:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/events/${eventId}/certificates/${certId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        setCerts(certs.map(c => c.id === certId ? { ...c, status: 'revoked' } : c));
        setStats(s => ({ ...s, revoked: s.revoked + 1, generated: s.generated - 1 }));
      }
    } catch (e) {
      toast('Failed to revoke', 'error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Certs</span>
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Certificates</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manually generate and manage certificates
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="hp-btn hp-btn-primary">
          + Generate Certificate
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#fff' },
          { label: 'Generated', value: stats.generated, color: '#FCA311' },
          { label: 'Downloaded', value: stats.downloaded, color: '#10b981' },
          { label: 'Revoked', value: stats.revoked, color: '#ef4444' },
        ].map((s) => (
          <div key={s.label} className="hp-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: '#71717a', fontSize: '0.8rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowPreview(null)}
        >
          <div className="hp-glass" style={{ padding: '2rem', width: '700px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Certificate Preview</h2>
              <button onClick={() => setShowPreview(null)} className="hp-btn hp-btn-ghost">✕</button>
            </div>

            {/* Certificate preview card */}
            <div style={{
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 30%, #fef3c7 60%, #fde68a 100%)',
              borderRadius: '1rem', padding: '2.5rem', position: 'relative',
              border: '3px solid #92400e',
              aspectRatio: '1.414',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ color: '#92400e', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>
                Certificate of Participation
              </div>
              <div style={{ color: '#78350f', fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.75rem' }}>
                {showPreview.manual_data?.name || 'Participant Name'}
              </div>
              <div style={{ color: '#92400e', fontSize: '0.9rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                has successfully participated in
              </div>
              <div style={{ color: '#78350f', fontSize: '1.25rem', fontWeight: 600, textAlign: 'center', marginBottom: '1rem' }}>
                {showPreview.manual_data?.event_title || 'Event Title'}
              </div>
              <div style={{ color: '#a16207', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                {showPreview.manual_data?.event_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{
                padding: '0.25rem 1rem', background: 'rgba(146, 64, 14, 0.1)', borderRadius: '0.5rem',
                color: '#78350f', fontFamily: 'var(--font-jetbrains)', fontSize: '0.75rem',
              }}>
                {showPreview.certificate_number}
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="hp-btn hp-btn-secondary"
                onClick={() => {
                  if (showPreview.pdf_url) {
                    window.open(showPreview.pdf_url, '_blank');
                  } else {
                    window.location.href = `/api/events/${eventId}/certs/${showPreview.id}/download?format=pdf`;
                  }
                }}
              >Download PDF</button>
              <button
                className="hp-btn hp-btn-secondary"
                onClick={() => {
                  window.location.href = `/api/events/${eventId}/certs/${showPreview.id}/download?format=png`;
                }}
              >Download PNG</button>
              <button
                className="hp-btn hp-btn-ghost"
                style={{ color: '#E5E5E5' }}
                onClick={() => {
                  const url = `${window.location.origin}/verify?token=${showPreview.access_token}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast('Share link copied to clipboard!', 'success');
                  }).catch(() => {
                    prompt('Copy this link:', url);
                  });
                }}
              >Share Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div className="hp-glass" style={{ padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>
              Generate Certificate
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Recipient Name *</label>
                <input className="hp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Email (optional)</label>
                <input className="hp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Certificate Type *</label>
                  <select className="hp-input" value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })}>
                    <option value="">Select type</option>
                    <option value="participation">Participation</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="organizer">Organizer</option>
                    <option value="speaker">Speaker</option>
                    <option value="winner">Winner</option>
                    <option value="runner_up">Runner-Up</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Template *</label>
                  <select className="hp-input" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}>
                    <option value="">Select template</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Event Title (override)</label>
                <input className="hp-input" value={form.event_title} onChange={(e) => setForm({ ...form, event_title: e.target.value })} placeholder="Event name to display" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Event Date (override)</label>
                <input className="hp-input" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowAdd(false)} className="hp-btn hp-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={handleAdd}
                className="hp-btn hp-btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !form.name || !form.type_id || !form.template_id}
              >
                {saving ? 'Generating...' : 'Generate Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="hp-skeleton" style={{ height: '80px', borderRadius: '0.75rem' }} />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <div className="hp-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#71717a' }}>No manually generated certificates yet.</p>
          <p style={{ color: '#52525b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Generate certificates manually for participants not in the registration system.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {certs.map((c) => (
            <div key={c.id} className="hp-card" style={{ padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '0.5rem',
                    background: c.status === 'revoked' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(84, 172, 191, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  }}>
                    📜
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                      {c.manual_data?.name || 'Unknown'}
                    </div>
                    <div style={{ color: '#71717a', fontSize: '0.75rem', fontFamily: 'var(--font-jetbrains)' }}>
                      {c.certificate_number}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`hp-badge ${
                    c.status === 'revoked' ? 'hp-badge-error' :
                    c.status === 'downloaded' ? 'hp-badge-success' : 'hp-badge-primary'
                  }`}>
                    {c.status}
                  </span>
                  <button
                    onClick={() => setShowPreview(c)}
                    className="hp-btn hp-btn-ghost"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Preview
                  </button>
                  {c.status !== 'revoked' && (
                    <button
                      onClick={() => handleRevoke(c.id)}
                      className="hp-btn hp-btn-ghost"
                      style={{ fontSize: '0.8rem', color: '#ef4444' }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

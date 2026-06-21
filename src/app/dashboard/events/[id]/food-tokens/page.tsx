'use client';

import { useState, useEffect, useCallback, use } from 'react';

interface TokenType {
  id: string;
  name: string;
  description: string | null;
  meal_time: string;
  valid_from: string | null;
  valid_to: string | null;
  max_uses_per_person: number;
  total_quantity: number | null;
  used_quantity: number;
  is_active: boolean;
  created_at: string;
}

interface TokenStats {
  total_issued: number;
  total_used: number;
  total_active: number;
  total_cancelled: number;
  by_type: {
    type_id: string;
    name: string;
    meal_time: string;
    total_issued: number;
    used: number;
    active: number;
    cancelled: number;
    remaining: number;
  }[];
}

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f59e0b',
  lunch: '#10b981',
  dinner: '#6366f1',
  snack: '#ec4899',
};

export default function FoodTokensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [activeTab, setActiveTab] = useState<'types' | 'generate' | 'validate' | 'stats'>('types');
  const [tokenTypes, setTokenTypes] = useState<TokenType[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', description: '', meal_time: 'breakfast', total_quantity: '', valid_from: '', valid_to: '',
  });
  const [saving, setSaving] = useState(false);

  // Generate form
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Validate form
  const [tokenCode, setTokenCode] = useState('');
  const [validateResult, setValidateResult] = useState<{ success: boolean; message: string; data?: unknown } | null>(null);
  const [validating, setValidating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [typesRes, statsRes, regsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/food-tokens`),
        fetch(`/api/events/${eventId}/food-tokens/stats`),
        fetch(`/api/events/${eventId}/registrations?status=confirmed`).catch(() => ({ json: () => ({ data: { registrations: [] } }) })),
      ]);

      const typesData = await typesRes.json();
      if (typesData.data?.tokenTypes) setTokenTypes(typesData.data.tokenTypes);

      const statsData = await statsRes.json();
      if (statsData.data?.stats) setStats(statsData.data.stats);

      const regsData = await regsRes.json();
      if (regsData.data?.registrations) setRegistrations(regsData.data.registrations);
    } catch (e) {
      console.error('Failed to load food token data');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.meal_time) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/food-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          total_quantity: createForm.total_quantity ? parseInt(createForm.total_quantity) : undefined,
          valid_from: createForm.valid_from || undefined,
          valid_to: createForm.valid_to || undefined,
        }),
      });
      const data = await res.json();
      if (data.data?.tokenType) {
        setTokenTypes([data.data.tokenType, ...tokenTypes]);
        setShowCreate(false);
        setCreateForm({ name: '', description: '', meal_time: 'breakfast', total_quantity: '', valid_from: '', valid_to: '' });
      }
    } catch (e) {
      alert('Failed to create token type');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTypeId || selectedRegIds.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/food-tokens/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_type_id: selectedTypeId, registration_ids: selectedRegIds }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Generated ${data.data.generated} tokens, skipped ${data.data.skipped}`);
        setSelectedRegIds([]);
        fetchAll();
      }
    } catch (e) {
      alert('Failed to generate tokens');
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async () => {
    if (!tokenCode) return;
    setValidating(true);
    setValidateResult(null);
    try {
      const res = await fetch(`/api/events/${eventId}/food-tokens/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_code: tokenCode }),
      });
      const data = await res.json();
      if (data.error) {
        setValidateResult({ success: false, message: data.error });
      } else {
        setValidateResult({ success: true, message: 'Token validated successfully', data: data.data?.token });
        setTokenCode('');
      }
    } catch (e) {
      setValidateResult({ success: false, message: 'Network error' });
    } finally {
      setValidating(false);
    }
  };

  const tabs = [
    { key: 'types', label: 'Token Types' },
    { key: 'generate', label: 'Generate' },
    { key: 'validate', label: 'Validate' },
    { key: 'stats', label: 'Stats' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Food Tokens</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage meal token distribution and scanning
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`hp-btn ${activeTab === t.key ? 'hp-btn-primary' : 'hp-btn-ghost'}`}
            style={{ fontSize: '0.85rem' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="hp-skeleton" style={{ height: '72px', borderRadius: '0.75rem' }} />)}
        </div>
      ) : (
        <>
          {/* Token Types Tab */}
          {activeTab === 'types' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button onClick={() => setShowCreate(true)} className="hp-btn hp-btn-primary">Add Token Type</button>
              </div>

              {showCreate && (
                <div className="hp-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>Create Token Type</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Name *</label>
                      <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="e.g. Breakfast Day 1" className="hp-input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Meal Time *</label>
                      <select value={createForm.meal_time} onChange={e => setCreateForm({ ...createForm, meal_time: e.target.value })} className="hp-input" style={{ width: '100%' }}>
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                      <input value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                        className="hp-input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Total Quantity</label>
                      <input type="number" value={createForm.total_quantity} onChange={e => setCreateForm({ ...createForm, total_quantity: e.target.value })}
                        placeholder="Unlimited if empty" className="hp-input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Valid From</label>
                      <input type="datetime-local" value={createForm.valid_from} onChange={e => setCreateForm({ ...createForm, valid_from: e.target.value })}
                        className="hp-input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Valid To</label>
                      <input type="datetime-local" value={createForm.valid_to} onChange={e => setCreateForm({ ...createForm, valid_to: e.target.value })}
                        className="hp-input" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowCreate(false)} className="hp-btn hp-btn-ghost">Cancel</button>
                    <button onClick={handleCreate} className="hp-btn hp-btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
                  </div>
                </div>
              )}

              {tokenTypes.length === 0 ? (
                <div className="hp-card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#71717a' }}>No token types created yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', padding: '0.5rem 1rem', fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div>Name</div>
                    <div>Meal</div>
                    <div>Issued</div>
                    <div>Used</div>
                    <div>Remaining</div>
                    <div>Status</div>
                    <div></div>
                  </div>
                  {tokenTypes.map(tt => (
                    <div key={tt.id} className="hp-card" style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>{tt.name}</div>
                          {tt.description && <div style={{ color: '#71717a', fontSize: '0.75rem' }}>{tt.description}</div>}
                        </div>
                        <div>
                          <span style={{ color: MEAL_COLORS[tt.meal_time] || '#fff', fontSize: '0.85rem' }}>
                            {MEAL_ICONS[tt.meal_time] || ''} {tt.meal_time}
                          </span>
                        </div>
                        <div style={{ color: '#818cf8', fontSize: '0.85rem' }}>{tt.used_quantity + (stats?.by_type.find(b => b.type_id === tt.id)?.active || 0)}</div>
                        <div style={{ color: '#10b981', fontSize: '0.85rem' }}>{tt.used_quantity}</div>
                        <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{stats?.by_type.find(b => b.type_id === tt.id)?.remaining ?? '—'}</div>
                        <div>
                          <span className={`hp-badge ${tt.is_active ? 'hp-badge-success' : 'hp-badge-error'}`}>
                            {tt.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <div className="hp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>Generate Tokens</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Token Type *</label>
                <select value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)} className="hp-input" style={{ width: '100%' }}>
                  <option value="">Select a token type</option>
                  {tokenTypes.filter(t => t.is_active).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.meal_time})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                  Registrations ({registrations.length} confirmed)
                </label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                  {registrations.length === 0 ? (
                    <p style={{ color: '#71717a', fontSize: '0.85rem' }}>No confirmed registrations found.</p>
                  ) : (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <input
                          type="checkbox"
                          checked={selectedRegIds.length === registrations.length}
                          onChange={e => setSelectedRegIds(e.target.checked ? registrations.map(r => r.id) : [])}
                        />
                        <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Select All</span>
                      </label>
                      {registrations.map(r => (
                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <input
                            type="checkbox"
                            checked={selectedRegIds.includes(r.id)}
                            onChange={e => setSelectedRegIds(e.target.checked ? [...selectedRegIds, r.id] : selectedRegIds.filter(id => id !== r.id))}
                          />
                          <span style={{ color: '#fff', fontSize: '0.8rem' }}>{r.first_name} {r.last_name}</span>
                          <span style={{ color: '#71717a', fontSize: '0.75rem' }}>{r.email}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{selectedRegIds.length} selected</span>
                <button onClick={handleGenerate} className="hp-btn hp-btn-primary" disabled={generating || !selectedTypeId || selectedRegIds.length === 0}>
                  {generating ? 'Generating...' : `Generate ${selectedRegIds.length} Tokens`}
                </button>
              </div>
            </div>
          )}

          {/* Validate Tab */}
          {activeTab === 'validate' && (
            <div className="hp-card" style={{ padding: '1.5rem', maxWidth: '500px' }}>
              <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>Validate Token</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#a1a1aa', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Token Code</label>
                <input
                  value={tokenCode}
                  onChange={e => setTokenCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FT-A1B2C3D4"
                  className="hp-input"
                  style={{ width: '100%', fontFamily: 'var(--font-jetbrains)', fontSize: '1.1rem', letterSpacing: '0.1em' }}
                  onKeyDown={e => e.key === 'Enter' && handleValidate()}
                  autoFocus
                />
              </div>
              <button onClick={handleValidate} className="hp-btn hp-btn-primary" style={{ width: '100%' }} disabled={validating || !tokenCode}>
                {validating ? 'Validating...' : 'Validate'}
              </button>

              {validateResult && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${validateResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  background: validateResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                }}>
                  <div style={{ color: validateResult.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {validateResult.success ? '✓ Valid' : '✗ Invalid'}
                  </div>
                  <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{validateResult.message}</div>
                  {validateResult.data && (
                    <div style={{ marginTop: '0.5rem', color: '#71717a', fontSize: '0.75rem' }}>
                      <div>Type: {(validateResult.data as Record<string, unknown>)?.token_type && typeof (validateResult.data as Record<string, unknown>).token_type === 'object' ? ((validateResult.data as Record<string, Record<string, unknown>>).token_type as Record<string, unknown>).name : '—'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Issued', value: stats.total_issued, color: '#818cf8' },
                  { label: 'Used', value: stats.total_used, color: '#10b981' },
                  { label: 'Active', value: stats.total_active, color: '#f59e0b' },
                  { label: 'Cancelled', value: stats.total_cancelled, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="hp-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ color: '#71717a', fontSize: '0.75rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {stats.by_type.length > 0 && (
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>By Token Type</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {stats.by_type.map(bt => (
                      <div key={bt.type_id} className="hp-card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{bt.name}</div>
                          <span style={{ color: MEAL_COLORS[bt.meal_time] || '#fff', fontSize: '0.75rem' }}>{MEAL_ICONS[bt.meal_time] || ''} {bt.meal_time}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                          <div>
                            <div style={{ color: '#818cf8', fontWeight: 700, fontSize: '1.1rem' }}>{bt.total_issued}</div>
                            <div style={{ color: '#71717a', fontSize: '0.65rem' }}>Issued</div>
                          </div>
                          <div>
                            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{bt.used}</div>
                            <div style={{ color: '#71717a', fontSize: '0.65rem' }}>Used</div>
                          </div>
                          <div>
                            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem' }}>{bt.remaining}</div>
                            <div style={{ color: '#71717a', fontSize: '0.65rem' }}>Remaining</div>
                          </div>
                        </div>
                        {bt.total_issued > 0 && (
                          <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem', height: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(bt.used / bt.total_issued) * 100}%`, background: '#10b981', borderRadius: '0.25rem' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

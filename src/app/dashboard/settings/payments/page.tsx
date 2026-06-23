'use client';

import { useState, useEffect } from 'react';

interface PaymentMethod {
  id: string;
  method_type: 'bank_account' | 'upi';
  bank_name: string | null;
  account_holder_name: string;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  upi_id: string | null;
  is_active: boolean;
  display_order: number;
}

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'bank_account' | 'upi'>('bank_account');
  const [form, setForm] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    upi_id: '',
  });
  const [saving, setSaving] = useState(false);

  // CSV Export state
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportMethodType, setExportMethodType] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/payment-methods');
      const data = await res.json();
      if (data.success) setMethods(data.data);
    } catch (e) {
      console.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method_type: addType,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMethods([...methods, data.data]);
        setShowAdd(false);
        setForm({ account_holder_name: '', bank_name: '', account_number: '', ifsc_code: '', branch_name: '', upi_id: '' });
      } else {
        alert(data.error || 'Failed to add payment method');
      }
    } catch (e) {
      alert('Failed to add payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    try {
      const res = await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMethods(methods.filter(m => m.id !== id));
      }
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/payment-methods/${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setMethods(methods.map(m => m.id === id ? { ...m, is_active: !m.is_active } : m));
      }
    } catch (e) {
      alert('Failed to toggle');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFrom) params.set('from', exportFrom);
      if (exportTo) params.set('to', exportTo);
      if (exportStatus) params.set('status', exportStatus);
      if (exportMethodType) params.set('method_type', exportMethodType);

      const res = await fetch(`/api/payments/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('Failed to export payments');
    } finally {
      setExporting(false);
    }
  };

  const bankCount = methods.filter(m => m.method_type === 'bank_account').length;
  const upiCount = methods.filter(m => m.method_type === 'upi').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Payment Methods</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage bank accounts and UPI for receiving event payments
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="hp-btn hp-btn-primary"
          disabled={bankCount >= 2 && upiCount >= 1}
        >
          + Add Method
        </button>
      </div>

      {loading ? (
        <div className="hp-skeleton" style={{ height: '200px', borderRadius: '0.75rem' }} />
      ) : methods.length === 0 ? (
        <div className="hp-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#71717a' }}>No payment methods configured yet.</p>
          <p style={{ color: '#52525b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Add bank accounts or UPI to receive payments from event registrations.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {methods.map((m) => (
            <div
              key={m.id}
              className={`hp-card ${m.is_active ? 'hp-card-highlighted' : ''}`}
              style={{ opacity: m.is_active ? 1 : 0.5 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '0.75rem',
                    background: m.method_type === 'bank_account' ? 'rgba(84, 172, 191, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                  }}>
                    {m.method_type === 'bank_account' ? '🏦' : '💳'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {m.method_type === 'bank_account' ? m.bank_name || 'Bank Account' : 'UPI'}
                    </div>
                    <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {m.method_type === 'bank_account'
                        ? `${m.account_holder_name} ••••${m.account_number?.slice(-4)}`
                        : m.upi_id}
                    </div>
                    {m.method_type === 'bank_account' && m.ifsc_code && (
                      <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        IFSC: {m.ifsc_code}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`hp-badge ${m.is_active ? 'hp-badge-success' : 'hp-badge-warning'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleToggle(m.id)}
                    className="hp-btn hp-btn-ghost"
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    {m.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="hp-btn hp-btn-ghost"
                    style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Limits info */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(84, 172, 191, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(84, 172, 191, 0.1)' }}>
        <p style={{ color: '#A7EBF2', fontSize: '0.8rem' }}>
          Limits: Maximum 2 bank accounts and 1 UPI method per organization.
          Currently: {bankCount}/2 bank accounts, {upiCount}/1 UPI.
        </p>
      </div>

      {/* Payment Transactions Export */}
      <div className="hp-card" style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Export Payment Transactions</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Download CSV of all transactions (Bank, UPI, Razorpay)
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>From Date</label>
            <input
              type="date"
              className="hp-input"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>To Date</label>
            <input
              type="date"
              className="hp-input"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Status</label>
            <select
              className="hp-input"
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Payment Method</label>
            <select
              className="hp-input"
              value={exportMethodType}
              onChange={(e) => setExportMethodType(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Methods</option>
              <option value="bank_account">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="hp-btn hp-btn-primary"
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div className="hp-glass" style={{ padding: '2rem', width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>
              Add Payment Method
            </h2>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setAddType('bank_account')}
                className={`hp-btn ${addType === 'bank_account' ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={bankCount >= 2}
              >
                🏦 Bank Account ({bankCount}/2)
              </button>
              <button
                onClick={() => setAddType('upi')}
                className={`hp-btn ${addType === 'upi' ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={upiCount >= 1}
              >
                💳 UPI ({upiCount}/1)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                  Account Holder Name *
                </label>
                <input
                  className="hp-input"
                  value={form.account_holder_name}
                  onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })}
                  placeholder="Full name as on bank account"
                />
              </div>

              {addType === 'bank_account' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                      Bank Name
                    </label>
                    <input
                      className="hp-input"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      placeholder="e.g. State Bank of India"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                      Account Number *
                    </label>
                    <input
                      className="hp-input"
                      value={form.account_number}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      placeholder="Account number"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                        IFSC Code *
                      </label>
                      <input
                        className="hp-input"
                        value={form.ifsc_code}
                        onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })}
                        placeholder="SBIN0001234"
                        maxLength={11}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                        Branch
                      </label>
                      <input
                        className="hp-input"
                        value={form.branch_name}
                        onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                        placeholder="Branch name"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                    UPI ID *
                  </label>
                  <input
                    className="hp-input"
                    value={form.upi_id}
                    onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                    placeholder="yourname@bank"
                  />
                  <p style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Format: username@provider (e.g. user@okicici, user@paytm)
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowAdd(false)}
                className="hp-btn hp-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="hp-btn hp-btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !form.account_holder_name}
              >
                {saving ? 'Adding...' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

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
  const { toast } = useToast();
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
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<string | null>(null);

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
        toast(data.error || 'Failed to add payment method', 'error');
      }
    } catch (e) {
      toast('Failed to add payment method', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeDeletePayment = async () => {
    const id = confirmDeletePayment;
    if (!id) return;
    setConfirmDeletePayment(null);
    try {
      const res = await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMethods(methods.filter(m => m.id !== id));
      }
    } catch (e) {
      toast('Failed to delete', 'error');
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
      toast('Failed to toggle', 'error');
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
      toast('Failed to export payments', 'error');
    } finally {
      setExporting(false);
    }
  };

  const bankCount = methods.filter(m => m.method_type === 'bank_account').length;
  const upiCount = methods.filter(m => m.method_type === 'upi').length;

  return (
    <div className="max-w-[800px] mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
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
        <div className="hp-skeleton h-[200px] rounded-xl" />
      ) : methods.length === 0 ? (
        <div className="hp-glass-card text-center py-12">
          <p className="text-[#71717a]">No payment methods configured yet.</p>
          <p className="text-xs text-[#52525b] mt-2">
            Add bank accounts or UPI to receive payments from event registrations.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {methods.map(m => (
            <div
              key={m.id}
              className={`hp-glass-card p-5 ${m.is_active ? '' : 'opacity-50'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    m.method_type === 'bank_account' ? 'bg-[#54acbf]/15' : 'bg-[#06b6d4]/15'
                  }`}>
                    {m.method_type === 'bank_account' ? '🏦' : '💳'}
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      {m.method_type === 'bank_account' ? m.bank_name || 'Bank Account' : 'UPI'}
                    </div>
                    <div className="text-sm text-[#a1a1aa] mt-0.5">
                      {m.method_type === 'bank_account'
                        ? `${m.account_holder_name} ••••${m.account_number?.slice(-4)}`
                        : m.upi_id}
                    </div>
                    {m.method_type === 'bank_account' && m.ifsc_code && (
                      <div className="text-xs text-[#71717a] mt-0.5">
                        IFSC: {m.ifsc_code}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`hp-badge ${m.is_active ? 'hp-badge-success' : 'hp-badge-warning'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleToggle(m.id)}
                    className="hp-btn hp-btn-ghost px-3 py-1.5 text-xs"
                  >
                    {m.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => setConfirmDeletePayment(m.id)}
                    className="hp-btn hp-btn-ghost px-3 py-1.5 text-xs text-[#ef4444] hover:text-white"
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
      <div className="mt-8 p-4 bg-[#54acbf]/[0.05] rounded-xl border border-[#54acbf]/10">
        <p className="text-sm text-[var(--hp-text-secondary)]">
          Limits: Maximum 2 bank accounts and 1 UPI method per organization.
          Currently: {bankCount}/2 bank accounts, {upiCount}/1 UPI.
        </p>
      </div>

      {/* Payment Transactions Export */}
      <div className="hp-glass-card mt-8 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Export Payment Transactions</h2>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Download CSV of all transactions (Bank, UPI, Razorpay)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-[11px] text-[#a1a1aa] mb-1">From Date</label>
            <input
              type="date"
              className="hp-input w-full"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#a1a1aa] mb-1">To Date</label>
            <input
              type="date"
              className="hp-input w-full"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#a1a1aa] mb-1">Status</label>
            <select
              className="hp-input w-full"
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#a1a1aa] mb-1">Payment Method</label>
            <select
              className="hp-input w-full"
              value={exportMethodType}
              onChange={(e) => setExportMethodType(e.target.value)}
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center">
          <div className="hp-glass-card p-8 w-[480px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-6">
              Add Payment Method
            </h2>

            {/* Type selector */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setAddType('bank_account')}
                className={`hp-btn flex-1 ${addType === 'bank_account' ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
                disabled={bankCount >= 2}
              >
                🏦 Bank Account ({bankCount}/2)
              </button>
              <button
                onClick={() => setAddType('upi')}
                className={`hp-btn flex-1 ${addType === 'upi' ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
                disabled={upiCount >= 1}
              >
                💳 UPI ({upiCount}/1)
              </button>
            </div>

            <div className="flex flex-col gap-4">
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
                    <label className="block text-xs text-[#a1a1aa] mb-1">
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
                    <label className="block text-xs text-[#a1a1aa] mb-1">
                      Account Number *
                    </label>
                    <input
                      className="hp-input"
                      value={form.account_number}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-[#a1a1aa] mb-1">
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
                    <div className="flex-1">
                      <label className="block text-xs text-[#a1a1aa] mb-1">
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
                  <label className="block text-xs text-[#a1a1aa] mb-1">
                    UPI ID *
                  </label>
                  <input
                    className="hp-input"
                    value={form.upi_id}
                    onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                    placeholder="yourname@bank"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1">
                    Format: username@provider (e.g. user@okicici, user@paytm)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="hp-btn hp-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="hp-btn hp-btn-primary flex-1"
                disabled={saving || !form.account_holder_name}
              >
                {saving ? 'Adding...' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDeletePayment !== null}
        title="Delete Payment Method"
        message="Delete this payment method? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDeletePayment}
        onCancel={() => setConfirmDeletePayment(null)}
      />
    </div>
  );
}

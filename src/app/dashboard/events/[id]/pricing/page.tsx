'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PaymentMethod {
  id: string;
  method_type: 'bank_account' | 'upi';
  bank_name: string | null;
  account_holder_name: string;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
}

interface EventPricingData {
  is_free: boolean;
  ticket_price: number;
  currency: string;
  payment_method_ids: string[];
}

export default function EventPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [pricing, setPricing] = useState<EventPricingData>({
    is_free: true,
    ticket_price: 0,
    currency: 'INR',
    payment_method_ids: [],
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPricing();
    fetchPaymentMethods();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await fetch(`/api/events?status=`);
      const data = await res.json();
      const event = data.data?.events?.find((e: { id: string }) => e.id === eventId);
      if (event) {
        setPricing({
          is_free: event.is_free ?? true,
          ticket_price: event.ticket_price ?? 0,
          currency: event.currency ?? 'INR',
          payment_method_ids: event.payment_method_ids ?? [],
        });
      }
    } catch (e) {
      console.error('Failed to load pricing');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch('/api/payment-methods');
      const data = await res.json();
      if (data.success) setPaymentMethods(data.data.filter((m: PaymentMethod & { is_active: boolean }) => m.is_active));
    } catch (e) {
      console.error('Failed to load payment methods');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          is_free: pricing.is_free,
          ticket_price: pricing.is_free ? 0 : pricing.ticket_price,
          currency: pricing.currency,
          payment_method_ids: pricing.payment_method_ids,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      alert('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    setPricing(prev => ({
      ...prev,
      payment_method_ids: prev.payment_method_ids.includes(methodId)
        ? prev.payment_method_ids.filter(id => id !== methodId)
        : [...prev.payment_method_ids, methodId],
    }));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Pricing</span>
      </nav>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
        Event Pricing
      </h1>
      <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Configure whether this event is free or paid
      </p>

      {/* Free / Paid toggle */}
      <div className="hp-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#fff' }}>Event is Free</div>
            <div style={{ color: '#71717a', fontSize: '0.8rem' }}>
              Enable to make registration free for all attendees
            </div>
          </div>
          <button
            onClick={() => setPricing({ ...pricing, is_free: !pricing.is_free })}
            style={{
              width: '52px', height: '28px', borderRadius: '14px',
              background: pricing.is_free ? '#FCA311' : '#27272a',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: '#fff', position: 'absolute', top: '3px',
              left: pricing.is_free ? '27px' : '3px',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Price input */}
      {!pricing.is_free && (
        <div className="hp-card" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>
            Ticket Price
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={pricing.currency}
              onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
              className="hp-input"
              style={{ width: '100px' }}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            <input
              type="number"
              className="hp-input"
              value={pricing.ticket_price}
              onChange={(e) => setPricing({ ...pricing, ticket_price: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              placeholder="0.00"
              style={{ flex: 1 }}
            />
          </div>
          <p style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Set to 0 for free registration
          </p>
        </div>
      )}

      {/* Payment methods selection */}
      {!pricing.is_free && paymentMethods.length > 0 && (
        <div className="hp-card" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem' }}>
            Payment Methods (select which to accept)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {paymentMethods.map((m) => (
              <label
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: '0.5rem',
                  background: pricing.payment_method_ids.includes(m.id) ? 'rgba(84, 172, 191, 0.1)' : 'transparent',
                  border: `1px solid ${pricing.payment_method_ids.includes(m.id) ? 'rgba(84, 172, 191, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={pricing.payment_method_ids.includes(m.id)}
                  onChange={() => togglePaymentMethod(m.id)}
                  style={{ accentColor: '#FCA311' }}
                />
                <div>
                  <div style={{ color: '#fff', fontSize: '0.875rem' }}>
                    {m.method_type === 'bank_account' ? `🏦 ${m.bank_name || 'Bank Account'}` : `💳 UPI — ${m.upi_id}`}
                  </div>
                  <div style={{ color: '#71717a', fontSize: '0.75rem' }}>
                    {m.method_type === 'bank_account'
                      ? `${m.account_holder_name} ••••${m.account_number?.slice(-4)}`
                      : m.upi_id}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {!pricing.is_free && paymentMethods.length === 0 && (
        <div className="hp-card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>
            No payment methods configured. Add bank accounts or UPI in{' '}
            <a href="/dashboard/settings/payments" style={{ color: '#E5E5E5' }}>Settings &gt; Payments</a>.
          </p>
        </div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button onClick={handleSave} className="hp-btn hp-btn-primary" disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Pricing'}
        </button>
        {saved && <span className="hp-badge hp-badge-success">Changes saved</span>}
      </div>
    </div>
  );
}

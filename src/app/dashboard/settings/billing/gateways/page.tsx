'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Gateway {
  id: string;
  provider: string;
  is_active: boolean;
  created_at: string;
}

export default function BillingGatewaysPage() {
  const router = useRouter();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState('razorpay');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/billing/gateways')
      .then(r => r.json())
      .then(data => { setGateways(data.gateways || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addGateway = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/billing/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key_id: keyId, key_secret: keySecret }),
      });
      if (res.ok) {
        const data = await res.json();
        setGateways([...gateways, data.gateway]);
        setShowAdd(false);
        setKeyId('');
        setKeySecret('');
      }
    } catch {}
    setSaving(false);
  };

  const removeGateway = async (id: string) => {
    await fetch(`/api/billing/gateways/${id}`, { method: 'DELETE' });
    setGateways(gateways.filter(g => g.id !== id));
  };

  return (
    <div className="min-h-screen text-white font-sans antialiased">
      <nav className="flex justify-between items-center px-6 py-4 border-b border-white/[0.06] bg-[rgba(20,33,61,0.6)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-sm text-[var(--hp-text-secondary)] hover:text-[var(--hp-text)] transition-colors px-2 py-1 rounded-md">&larr; Back</button>
          <span className="text-[var(--hp-text-muted)]">/</span>
          <Link href="/dashboard/settings/billing" className="text-sm text-[var(--hp-text-secondary)] hover:text-[var(--hp-text)] no-underline transition-colors">Billing</Link>
          <span className="text-[var(--hp-text-muted)]">/</span>
          <span className="text-sm text-white font-medium">Payment Gateways</span>
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Payment Gateways</h1>
            <p className="text-sm text-[var(--hp-text-secondary)] mt-1">Configure Razorpay or Cashfree to accept payments</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="hp-btn hp-btn-primary">+ Add Gateway</button>
        </div>

        {showAdd && (
          <Card className="hp-glass-card" style={{ marginBottom: '1.5rem' }}>
            <CardHeader><CardTitle style={{ color: '#fff' }}>Add Payment Gateway</CardTitle></CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <Label style={{ color: '#E5E5E5' }}>Provider</Label>
                <select value={provider} onChange={e => setProvider(e.target.value)} className="hp-input" style={{ marginTop: '0.25rem' }}>
                  <option value="razorpay">Razorpay</option>
                  <option value="cashfree">Cashfree</option>
                </select>
              </div>
              <div>
                <Label style={{ color: '#E5E5E5' }}>API Key ID</Label>
                <Input value={keyId} onChange={e => setKeyId(e.target.value)} placeholder="rzp_live_..." className="hp-input" style={{ marginTop: '0.25rem' }} />
              </div>
              <div>
                <Label style={{ color: '#E5E5E5' }}>API Key Secret</Label>
                <Input type="password" value={keySecret} onChange={e => setKeySecret(e.target.value)} placeholder="Enter secret..." className="hp-input" style={{ marginTop: '0.25rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addGateway} disabled={!keyId || !keySecret || saving} className="hp-btn hp-btn-primary" style={{ opacity: !keyId || !keySecret || saving ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Gateway'}</button>
                <button onClick={() => setShowAdd(false)} className="hp-btn hp-btn-secondary">Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#E5E5E5' }}>Loading gateways...</div>
        ) : gateways.length === 0 ? (
          <div style={{
            background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)',
            borderRadius: '12px', padding: '3rem', textAlign: 'center',
          }}>
            <p style={{ color: '#E5E5E5', marginBottom: '1rem' }}>No payment gateways configured yet.</p>
            <p style={{ color: '#888888', fontSize: '0.8rem' }}>Add Razorpay or Cashfree to start accepting payments.</p>
          </div>
        ) : (
          <Card className="hp-glass-card">
            <CardContent style={{ padding: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom: '1px solid rgba(229,229,229,0.08)' }}>
                    <TableHead style={{ color: '#888888' }}>Provider</TableHead>
                    <TableHead style={{ color: '#888888' }}>Status</TableHead>
                    <TableHead style={{ color: '#888888' }}>Added</TableHead>
                    <TableHead style={{ color: '#888888' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map(gw => (
                    <TableRow key={gw.id} style={{ borderBottom: '1px solid rgba(229,229,229,0.05)' }}>
                      <TableCell style={{ color: '#fff', fontWeight: 500 }}>{gw.provider === 'razorpay' ? 'Razorpay' : 'Cashfree'}</TableCell>
                      <TableCell>
                        <span className={`hp-badge ${gw.is_active ? 'hp-badge-success' : 'hp-badge-error'}`}>{gw.is_active ? 'Active' : 'Inactive'}</span>
                      </TableCell>
                      <TableCell style={{ color: '#E5E5E5', fontSize: '0.8rem' }}>{new Date(gw.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <button onClick={() => removeGateway(gw.id)} className="hp-btn hp-btn-ghost text-red-400 hover:text-red-300" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}>Remove</button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

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
    <div style={{ minHeight: '100vh', background: '#011C40', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', borderBottom: '1px solid rgba(167,235,242,0.08)',
        background: 'rgba(2,56,89,0.6)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => router.back()} style={{
            background: 'none', border: 'none', color: '#9cb8c4', cursor: 'pointer',
            fontSize: '0.85rem', padding: '0.4rem 0.6rem', borderRadius: '6px',
          }}>← Back</button>
          <span style={{ color: '#5a7a8a' }}>/</span>
          <Link href="/dashboard/settings/billing" style={{ color: '#9cb8c4', textDecoration: 'none', fontSize: '0.85rem' }}>Billing</Link>
          <span style={{ color: '#5a7a8a' }}>/</span>
          <span style={{ color: '#A7EBF2', fontSize: '0.85rem', fontWeight: 500 }}>Payment Gateways</span>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Payment Gateways</h1>
            <p style={{ color: '#9cb8c4', fontSize: '0.85rem' }}>Configure Razorpay or Cashfree to accept payments</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} style={{
            background: 'linear-gradient(135deg, #54ACBF, #26658C)', color: '#fff',
            padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
          }}>+ Add Gateway</button>
        </div>

        {showAdd && (
          <Card style={{ background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.1)', marginBottom: '1.5rem' }}>
            <CardHeader><CardTitle style={{ color: '#fff' }}>Add Payment Gateway</CardTitle></CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <Label style={{ color: '#9cb8c4' }}>Provider</Label>
                <select value={provider} onChange={e => setProvider(e.target.value)} style={{
                  width: '100%', padding: '0.6rem', background: 'rgba(167,235,242,0.05)',
                  border: '1px solid rgba(167,235,242,0.15)', borderRadius: '8px', color: '#fff', marginTop: '0.25rem',
                }}>
                  <option value="razorpay">Razorpay</option>
                  <option value="cashfree">Cashfree</option>
                </select>
              </div>
              <div>
                <Label style={{ color: '#9cb8c4' }}>API Key ID</Label>
                <Input value={keyId} onChange={e => setKeyId(e.target.value)} placeholder="rzp_live_..." style={{ background: 'rgba(167,235,242,0.05)', borderColor: 'rgba(167,235,242,0.15)', color: '#fff' }} />
              </div>
              <div>
                <Label style={{ color: '#9cb8c4' }}>API Key Secret</Label>
                <Input type="password" value={keySecret} onChange={e => setKeySecret(e.target.value)} placeholder="Enter secret..." style={{ background: 'rgba(167,235,242,0.05)', borderColor: 'rgba(167,235,242,0.15)', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addGateway} disabled={!keyId || !keySecret || saving} style={{
                  background: 'linear-gradient(135deg, #54ACBF, #26658C)', color: '#fff',
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  opacity: !keyId || !keySecret || saving ? 0.5 : 1,
                }}>{saving ? 'Saving...' : 'Save Gateway'}</button>
                <button onClick={() => setShowAdd(false)} style={{
                  background: 'rgba(167,235,242,0.05)', color: '#9cb8c4',
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(167,235,242,0.15)',
                  fontSize: '0.85rem', cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9cb8c4' }}>Loading gateways...</div>
        ) : gateways.length === 0 ? (
          <div style={{
            background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.08)',
            borderRadius: '12px', padding: '3rem', textAlign: 'center',
          }}>
            <p style={{ color: '#9cb8c4', marginBottom: '1rem' }}>No payment gateways configured yet.</p>
            <p style={{ color: '#5a7a8a', fontSize: '0.8rem' }}>Add Razorpay or Cashfree to start accepting payments.</p>
          </div>
        ) : (
          <Card style={{ background: 'rgba(167,235,242,0.03)', border: '1px solid rgba(167,235,242,0.08)' }}>
            <CardContent style={{ padding: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom: '1px solid rgba(167,235,242,0.08)' }}>
                    <TableHead style={{ color: '#5a7a8a' }}>Provider</TableHead>
                    <TableHead style={{ color: '#5a7a8a' }}>Status</TableHead>
                    <TableHead style={{ color: '#5a7a8a' }}>Added</TableHead>
                    <TableHead style={{ color: '#5a7a8a' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map(gw => (
                    <TableRow key={gw.id} style={{ borderBottom: '1px solid rgba(167,235,242,0.05)' }}>
                      <TableCell style={{ color: '#fff', fontWeight: 500 }}>{gw.provider === 'razorpay' ? 'Razorpay' : 'Cashfree'}</TableCell>
                      <TableCell>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                          background: gw.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: gw.is_active ? '#10b981' : '#ef4444',
                        }}>{gw.is_active ? 'Active' : 'Inactive'}</span>
                      </TableCell>
                      <TableCell style={{ color: '#9cb8c4', fontSize: '0.8rem' }}>{new Date(gw.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <button onClick={() => removeGateway(gw.id)} style={{
                          background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem',
                        }}>Remove</button>
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

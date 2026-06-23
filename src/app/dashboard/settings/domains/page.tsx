'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  verification_method: string;
  last_verified_at: string | null;
  created_at: string;
}

interface DnsInstructions {
  domain: string;
  method: string;
  records: Array<{ type: string; name: string; value: string; ttl: number }>;
}

export default function DomainSettingsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await fetch('/api/branding/domain');
      const data = await response.json();
      if (data.data?.domains) {
        setDomains(data.data.domains);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load domains' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    setAdding(true);
    setMessage(null);

    try {
      const response = await fetch('/api/branding/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Domain added successfully' });
        setNewDomain('');
        if (data.data?.dns_instructions) {
          setDnsInstructions(data.data.dns_instructions);
        }
        fetchDomains();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add domain' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to add domain' });
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    setMessage(null);

    try {
      const response = await fetch('/api/branding/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: domainId }),
      });

      const data = await response.json();

      if (response.ok) {
        const verified = data.data?.verification?.verified;
        if (verified) {
          setMessage({ type: 'success', text: 'Domain verified successfully' });
        } else {
          setMessage({
            type: 'error',
            text: data.data?.verification?.error || 'Verification failed',
          });
        }
        fetchDomains();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to verify domain' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to verify domain' });
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteDomain = async (domainId: string, domain: string) => {
    if (!confirm(`Are you sure you want to remove ${domain}?`)) return;

    setMessage(null);

    try {
      const response = await fetch('/api/branding/domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: domainId }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Domain removed successfully' });
        fetchDomains();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to remove domain' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove domain' });
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '1rem 1.5rem', borderBottom: '1px solid rgba(229,229,229,0.08)',
      background: 'rgba(20,33,61,0.6)',
    }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
      <span style={{ color: '#888888' }}>/</span>
      <Link href="/dashboard" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Events</Link>
      <span style={{ color: '#888888' }}>/</span>
      <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: 500 }}>Settings</span>
    </nav>
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Custom Domain Settings</h1>

      {message && (
        <div
          className={`p-4 mb-6 rounded ${
            message.type === 'success'
              ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]'
              : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Domain */}
      <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Custom Domain</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="events.yourdomain.com"
            className="flex-1 border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
            onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
          />
          <button
            onClick={handleAddDomain}
            disabled={adding || !newDomain.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Domain'}
          </button>
        </div>
      </section>

      {/* DNS Instructions */}
      {dnsInstructions && (
        <section className="bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)] rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-2">DNS Configuration Required</h3>
          <p className="text-sm text-[#E5E5E5] mb-4">
            Add the following DNS records to your domain:
          </p>
          <div className="space-y-2">
            {dnsInstructions.records.map((record, index) => (
              <div key={index} className="bg-[rgba(229,229,229,0.03)] rounded p-3 border-[rgba(229,229,229,0.12)]">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-bold">{record.type}</span>
                  <span className="font-mono text-sm">{record.name}</span>
                  <span className="font-mono text-sm text-[#888888]">→</span>
                  <span className="font-mono text-sm">{record.value}</span>
                  <span className="text-xs text-[#888888]">TTL: {record.ttl}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDnsInstructions(null)}
            className="mt-4 text-sm text-[#E5E5E5] hover:text-white"
          >
            Dismiss
          </button>
        </section>
      )}

      {/* Domain List */}
      <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
        <h2 className="text-lg font-semibold mb-4">Your Domains</h2>

        {domains.length === 0 ? (
          <p className="text-[#888888]">No custom domains configured yet.</p>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between p-4 border-[rgba(229,229,229,0.12)] rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{domain.domain}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        domain.verified
                          ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                          : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                      }`}
                    >
                      {domain.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  {domain.last_verified_at && (
                    <p className="text-sm text-[#888888] mt-1">
                      Last verified: {new Date(domain.last_verified_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!domain.verified && (
                    <button
                      onClick={() => handleVerifyDomain(domain.id)}
                      disabled={verifying === domain.id}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {verifying === domain.id ? 'Verifying...' : 'Verify'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

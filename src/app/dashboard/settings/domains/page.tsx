'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/confirm-modal';

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
  const [confirmDeleteDomain, setConfirmDeleteDomain] = useState<{id: string; domain: string} | null>(null);
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

  const executeDeleteDomain = async () => {
    if (!confirmDeleteDomain) return;
    const { id: domainId } = confirmDeleteDomain;
    setConfirmDeleteDomain(null);

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
      <div className="flex items-center justify-center min-h-screen text-white">
        <Loader2 size={24} className="text-[#FCA311] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-sans antialiased">
    <nav className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-[rgba(20,33,61,0.6)]">
      <button onClick={() => router.back()} className="text-sm text-[#ccc] hover:text-white transition-colors">&larr; Back</button>
      <span className="text-[#666]">/</span>
      <Link href="/dashboard" className="text-sm text-[#ccc] hover:text-white no-underline transition-colors">Events</Link>
      <span className="text-[#666]">/</span>
      <span className="text-sm text-white font-medium">Settings</span>
    </nav>
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Custom Domain Settings</h1>

      {message && (
        <div className={'p-4 mb-6 rounded ' + (message.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-900/30' : 'bg-red-900/20 text-red-400 border-red-900/30')}>
          {message.text}
        </div>
      )}

      {/* Add Domain */}
      <section className="hp-glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Custom Domain</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="events.yourdomain.com"
            className="hp-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
          />
          <button
            onClick={handleAddDomain}
            disabled={adding || !newDomain.trim()}
            className="hp-btn hp-btn-primary disabled:opacity-50"
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
              <div key={index} className="hp-glass p-3">
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
      <section className="hp-glass-card p-6">
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
                      className={'hp-badge ' + (domain.verified ? 'hp-badge-success' : 'hp-badge-warning')}
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
                      className="hp-btn hp-btn-primary px-4 py-2 text-sm"
                    >
                      {verifying === domain.id ? 'Verifying...' : 'Verify'}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteDomain({id: domain.id, domain: domain.domain})}
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

      <ConfirmModal
        open={confirmDeleteDomain !== null}
        title="Remove Domain"
        message={'Are you sure you want to remove this domain?'}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={executeDeleteDomain}
        onCancel={() => setConfirmDeleteDomain(null)}
      />
    </div>
    </div>
  );
}

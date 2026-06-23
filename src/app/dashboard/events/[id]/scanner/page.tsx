'use client';

import { useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOfflineSync } from '@/hooks/use-offline-sync';

interface ScanResult {
  result: string;
  message: string;
  ticket_id?: string;
  ticket_number?: string;
  attendee_name?: string;
  attendee_email?: string;
  checked_in_at?: string;
}

interface ScanLog {
  id: number;
  time: string;
  result: string;
  message: string;
  ticket_number?: string;
  attendee_name?: string;
  offline?: boolean;
}

export default function ScannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const { isOnline, pendingCount, queueScan, syncPendingScans, syncing } = useOfflineSync();
  const [scanType, setScanType] = useState<'check_in' | 'check_out'>('check_in');
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanLog, setScanLog] = useState<ScanLog[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logIdRef = useRef(0);

  const processScan = useCallback(async (qrString: string) => {
    if (!qrString.trim() || scanning) return;
    setScanning(true);

    try {
      if (!isOnline) {
        // Queue for offline sync
        await queueScan({
          ticket_id: qrString.trim(),
          gate_id: 'offline-gate',
          scan_type: scanType,
          scanned_at: new Date().toISOString(),
        });

        logIdRef.current += 1;
        setScanLog(prev => [{
          id: logIdRef.current,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          result: 'queued',
          message: 'Queued for sync (offline)',
          offline: true,
        }, ...prev].slice(0, 50));

        setLastResult({ result: 'queued', message: 'Queued for sync — will process when online' });
        setTimeout(() => setLastResult(null), 4000);
        setManualInput('');
        inputRef.current?.focus();
        return;
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_string: qrString.trim(),
          event_id: eventId,
          scan_type: scanType,
        }),
      });
      const data = await res.json();
      const result = data.data as ScanResult;

      setLastResult(result);

      logIdRef.current += 1;
      setScanLog(prev => [{
        id: logIdRef.current,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        result: result.result,
        message: result.message,
        ticket_number: result.ticket_number,
        attendee_name: result.attendee_name,
      }, ...prev].slice(0, 50));

      setTimeout(() => setLastResult(null), 4000);
      setManualInput('');
      inputRef.current?.focus();
    } catch (e) {
      setLastResult({ result: 'invalid', message: 'Network error — check connection' });
      setTimeout(() => setLastResult(null), 4000);
    } finally {
      setScanning(false);
    }
  }, [eventId, scanType, scanning, isOnline, queueScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(manualInput);
  };

  const resultColor = (result: string) => {
    switch (result) {
      case 'success': return '#10b981';
      case 'duplicate': return '#f59e0b';
      case 'already_checked_in': return '#f59e0b';
      case 'expired': return '#ef4444';
      case 'invalid': return '#ef4444';
      case 'fraud_suspected': return '#dc2626';
      default: return '#71717a';
    }
  };

  const resultIcon = (result: string) => {
    switch (result) {
      case 'success': return '✓';
      case 'duplicate': return '⟳';
      case 'already_checked_in': return '✓';
      case 'expired': return '⏰';
      case 'invalid': return '✗';
      case 'fraud_suspected': return '⚠';
      default: return '?';
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Scanner</span>
      </nav>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>QR Scanner</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span style={{ color: '#71717a', fontSize: '0.75rem' }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingCount > 0 && (
            <span style={{ color: '#f59e0b', fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>
              {pendingCount} pending
            </span>
          )}
          {syncing && (
            <span style={{ color: '#3b82f6', fontSize: '0.7rem' }}>Syncing...</span>
          )}
        </div>
      </div>

      {/* Scan Type Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setScanType('check_in')}
          className={`hp-btn ${scanType === 'check_in' ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
          style={{ flex: 1 }}
        >
          Check In
        </button>
        <button
          onClick={() => setScanType('check_out')}
          className={`hp-btn ${scanType === 'check_out' ? 'hp-btn-primary' : 'hp-btn-secondary'}`}
          style={{ flex: 1 }}
        >
          Check Out
        </button>
      </div>

      {/* Last Result Banner */}
      {lastResult && (
        <div
          className="hp-animate-fade-in"
          style={{
            padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
            background: `${resultColor(lastResult.result)}15`,
            border: `1px solid ${resultColor(lastResult.result)}40`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: `${resultColor(lastResult.result)}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', color: resultColor(lastResult.result),
            }}>
              {resultIcon(lastResult.result)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: resultColor(lastResult.result), fontWeight: 600, fontSize: '0.9rem' }}>
                {lastResult.message}
              </div>
              {lastResult.attendee_name && (
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {lastResult.attendee_name} • {lastResult.ticket_number}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Input */}
      <form onSubmit={handleManualSubmit} style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: '#71717a', marginBottom: '0.35rem' }}>
          Scan or paste QR code
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            className="hp-input"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Scan QR or paste code here..."
            autoFocus
            disabled={scanning}
            style={{ fontFamily: 'var(--font-jetbrains)', fontSize: '0.85rem' }}
          />
          <button
            type="submit"
            className="hp-btn hp-btn-primary"
            disabled={scanning || !manualInput.trim()}
            style={{ minWidth: '80px' }}
          >
            {scanning ? '...' : 'Scan'}
          </button>
        </div>
      </form>

      {/* Scan Log */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa' }}>
            Recent Scans ({scanLog.length})
          </h2>
          {scanLog.length > 0 && (
            <button onClick={() => setScanLog([])} className="hp-btn hp-btn-ghost" style={{ fontSize: '0.7rem' }}>
              Clear
            </button>
          )}
        </div>

        {scanLog.length === 0 ? (
          <div className="hp-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#52525b', fontSize: '0.8rem' }}>No scans yet. Start scanning tickets.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {scanLog.map((log) => (
              <div
                key={log.id}
                className="hp-card"
                style={{
                  padding: '0.6rem 0.8rem',
                  borderLeft: `3px solid ${resultColor(log.result)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: resultColor(log.result), fontSize: '0.85rem', fontWeight: 600 }}>
                      {resultIcon(log.result)}
                    </span>
                    <div>
                      <span style={{ color: '#fff', fontSize: '0.8rem' }}>{log.message}</span>
                      {log.attendee_name && (
                        <span style={{ color: '#71717a', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          {log.attendee_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: '#52525b', fontSize: '0.65rem', fontFamily: 'var(--font-jetbrains)' }}>
                    {log.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fraud Summary */}
      {scanLog.length > 0 && (
        <div style={{
          marginTop: '1.5rem', padding: '0.75rem', borderRadius: '0.5rem',
          background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
            <span style={{ color: '#71717a' }}>
              ✓ {scanLog.filter(l => l.result === 'success').length} success
            </span>
            <span style={{ color: '#f59e0b' }}>
              ⟳ {scanLog.filter(l => l.result === 'duplicate').length} duplicate
            </span>
            <span style={{ color: '#ef4444' }}>
              ✗ {scanLog.filter(l => l.result === 'invalid').length} invalid
            </span>
            <span style={{ color: '#dc2626' }}>
              ⚠ {scanLog.filter(l => l.result === 'fraud_suspected').length} fraud
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

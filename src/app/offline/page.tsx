'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function OfflinePage() {
  const [reloading, setReloading] = useState(false);

  return (
    <main className="min-h-screen bg-hp-bg flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl" aria-hidden="true">📡</div>
        <h1 className="text-3xl font-bold text-white">You&apos;re Offline</h1>
        <p className="text-hp-text-muted text-sm">
          No internet connection. Some features may be limited.
        </p>
        <div className="space-y-3">
          <div className="hp-glass-card p-4 text-left">
            <h3 className="font-medium text-white mb-2 text-sm">Available Offline:</h3>
            <ul className="text-sm text-hp-text-muted space-y-1">
              <li>• View cached pages</li>
              <li>• Queue scans for sync</li>
              <li>• View recent data</li>
            </ul>
          </div>
          <div className="hp-glass-card p-4 text-left">
            <h3 className="font-medium text-white mb-2 text-sm">Unavailable Offline:</h3>
            <ul className="text-sm text-hp-text-muted space-y-1">
              <li>• Real-time updates</li>
              <li>• New registrations</li>
              <li>• Certificate generation</li>
            </ul>
          </div>
        </div>
        <Button
          onClick={() => { setReloading(true); window.location.reload(); }}
          disabled={reloading}
          className="w-full font-bold text-sm"
        >
          {reloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Reconnecting...
            </>
          ) : (
            'Try Again'
          )}
        </Button>
        <div className="flex gap-3">
          <Link href="/" className="flex-1 text-center px-4 py-2 rounded-lg text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface-hover)] transition-colors">
            Go Home
          </Link>
          <Link href="/auth/login" className="flex-1 text-center px-4 py-2 rounded-lg text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface-hover)] transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-transparent flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="text-7xl font-extrabold text-hp-primary leading-none mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-hp-text-muted text-sm mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="hp-btn hp-btn-primary" style={{ textDecoration: 'none' }}>Go Home</Link>
          <Link href="/auth/login" className="hp-btn hp-btn-secondary" style={{ textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </main>
  );
}

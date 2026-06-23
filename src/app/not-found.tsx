'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '5rem', fontWeight: 800, color: '#FCA311', lineHeight: 1, marginBottom: '1rem' }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Page not found</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '2rem' }}>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/" style={{
            background: '#FCA311', color: '#000', padding: '0.7rem 1.5rem', borderRadius: '10px',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
          }}>Go Home</Link>
          <Link href="/auth/login" style={{
            background: 'rgba(229,229,229,0.06)', border: '1px solid rgba(229,229,229,0.15)',
            color: '#E5E5E5', padding: '0.7rem 1.5rem', borderRadius: '10px',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
          }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

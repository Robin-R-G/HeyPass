'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

const NAV_ITEMS = [
  { label: 'Branding', href: '/dashboard/settings/branding' },
  { label: 'Payments', href: '/dashboard/settings/payments' },
  { label: 'Billing', href: '/dashboard/settings/billing' },
  { label: 'Domains', href: '/dashboard/settings/domains' },
  { label: 'API Keys', href: '/dashboard/settings/api-keys' },
  { label: 'Webhooks', href: '/dashboard/settings/webhooks' },
  { label: 'WhatsApp', href: '/dashboard/settings/whatsapp' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <nav style={{
        width: 220,
        flexShrink: 0,
        background: 'rgba(229,229,229,0.03)',
        borderRight: '1px solid rgba(229,229,229,0.08)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            color: '#E5E5E5',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontSize: '1rem' }}>←</span>
          Back to Events
        </Link>

        <div style={{
          borderTop: '1px solid rgba(229,229,229,0.08)',
          margin: '0.5rem 1.25rem 1rem',
        }} />

        <div style={{
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#888888',
          padding: '0 1.25rem',
          marginBottom: '0.5rem',
          fontWeight: 600,
        }}>
          Settings
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '0.5rem 1.25rem',
                color: isActive ? '#FCA311' : '#E5E5E5',
                textDecoration: 'none',
                fontSize: '0.85rem',
                background: isActive ? 'rgba(252,163,17,0.15)' : 'transparent',
                borderLeft: isActive ? '2px solid #FCA311' : '2px solid transparent',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

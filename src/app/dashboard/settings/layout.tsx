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
    <div className="flex min-h-screen font-sans antialiased">
      <nav className="w-[220px] shrink-0 bg-white/[0.02] border-r border-white/[0.06] flex flex-col py-6 hidden md:flex">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 text-sm text-[#ccc] hover:text-white no-underline mb-3 transition-colors"
        >
          &larr; Back to Events
        </Link>

        <div className="border-t border-white/[0.06] mx-5 mb-4" />

        <div className="text-[11px] font-semibold text-[#777] uppercase tracking-wider px-5 mb-2">
          Settings
        </div>

        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-2.5 text-sm no-underline transition-all duration-150 border-l-[3px] ${
                isActive
                  ? 'text-[#FCA311] bg-[#FCA311]/10 border-l-[#FCA311]'
                  : 'text-[#ccc] hover:text-white border-l-transparent hover:bg-white/[0.04]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

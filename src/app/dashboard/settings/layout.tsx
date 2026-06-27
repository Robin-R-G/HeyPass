'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

interface NavSection {
  title: string;
  items: { label: string; href: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Organization',
    items: [
      { label: 'Branding', href: '/dashboard/settings/branding' },
      { label: 'Domains', href: '/dashboard/settings/domains' },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Members', href: '/dashboard/settings/team' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'WhatsApp', href: '/dashboard/settings/whatsapp' },
      { label: 'API Keys', href: '/dashboard/settings/api-keys' },
      { label: 'Webhooks', href: '/dashboard/settings/webhooks' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Payments', href: '/dashboard/settings/payments' },
      { label: 'Plans', href: '/dashboard/settings/billing' },
    ],
  },
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

        <div className="border-t border-white/[0.06] mx-5 mb-5" />

        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'mt-5' : ''}>
            <div className="text-[10px] font-semibold text-[#555] uppercase tracking-wider px-5 mb-1.5">
              {section.title}
            </div>
            {section.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-5 py-2 text-sm no-underline transition-all duration-150 border-l-[3px] ${
                    isActive
                      ? 'text-[#FCA311] bg-[#FCA311]/10 border-l-[#FCA311]'
                      : 'text-[#ccc] hover:text-white border-l-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

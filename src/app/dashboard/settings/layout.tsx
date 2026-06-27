'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { ArrowLeft } from 'lucide-react';

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
      { label: 'Artificial Intelligence', href: '/dashboard/settings/ai' },
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-[240px] shrink-0 bg-[var(--hp-bg-elevated)] border-r border-[var(--hp-border)] flex flex-col py-6 hidden md:flex">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2 text-sm text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] no-underline mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Events
        </Link>

        <div className="hp-divider mx-5" />

        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'mt-5' : ''}>
            <div className="hp-kpi-label px-5 mb-1.5">
              {section.title}
            </div>
            {section.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-5 py-2 text-sm no-underline transition-all duration-[var(--hp-duration-fast)] border-l-[3px] ${
                    isActive
                      ? 'text-[var(--hp-primary)] bg-[var(--hp-primary)]/10 border-l-[var(--hp-primary)] font-medium'
                      : 'text-[var(--hp-text-secondary)] hover:text-[var(--hp-text)] border-l-transparent hover:bg-[var(--hp-surface-hover)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

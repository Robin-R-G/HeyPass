'use client';

import Link from 'next/link';

const EVENT_TABS = [
  { label: 'Dashboard', slug: 'dashboard' },
  { label: 'Ops Center', slug: 'operations' },
  { label: 'Tickets', slug: 'tickets' },
  { label: 'Gates', slug: 'gates' },
  { label: 'Staff', slug: 'staff' },
  { label: 'Volunteers', slug: 'volunteers' },
  { label: 'CRM', slug: 'crm' },
  { label: 'Forms', slug: 'forms' },
  { label: 'Brand', slug: 'branding' },
  { label: 'Analytics', slug: 'analytics' },
  { label: 'Certs', slug: 'certificates' },
  { label: 'Links', slug: 'links' },
  { label: 'Notify', slug: 'notifications' },
];

export function EventNav({ eventId, active }: { eventId: string; active: string }) {
  return (
    <nav className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none" role="navigation" aria-label="Event navigation">
      {EVENT_TABS.map(tab => {
        const isActive = tab.slug === active;
        return (
          <Link
            key={tab.slug}
            href={`/dashboard/events/${eventId}/${tab.slug}`}
            className={`shrink-0 px-3 py-1.5 rounded-[var(--hp-radius-sm)] text-xs font-medium transition-all duration-[var(--hp-duration-fast)] ${
              isActive
                ? 'bg-[var(--hp-primary)]/10 text-[var(--hp-primary)] border border-[var(--hp-primary)]/20 font-semibold'
                : 'text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface)] border border-transparent'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

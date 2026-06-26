'use client';

import Link from 'next/link';

const EVENT_TABS = [
  { label: 'Dashboard', slug: 'dashboard' },
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
    <nav className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none" role="navigation" aria-label="Event navigation">
      {EVENT_TABS.map(tab => {
        const isActive = tab.slug === active;
        return (
          <Link
            key={tab.slug}
            href={`/dashboard/events/${eventId}/${tab.slug}`}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              isActive
                ? 'bg-[#FCA311]/15 text-[#FCA311] border border-[#FCA311]/25 font-semibold'
                : 'text-[#999] hover:text-white hover:bg-white/5 border border-transparent'
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

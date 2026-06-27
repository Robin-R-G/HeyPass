'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { Brain, Settings, FileText, BarChart3 } from 'lucide-react';

const TABS = [
  { label: 'Overview', href: '/dashboard/settings/ai', icon: Brain },
  { label: 'Configuration', href: '/dashboard/settings/ai/config', icon: Settings },
  { label: 'Prompts', href: '/dashboard/settings/ai/prompts', icon: FileText },
  { label: 'Usage', href: '/dashboard/settings/ai/usage', icon: BarChart3 },
];

export default function AISettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen text-white font-sans antialiased">
      <nav className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-[rgba(20,33,61,0.6)]">
        <button onClick={() => router.back()} className="text-sm text-[#ccc] hover:text-white transition-colors">&larr; Back</button>
        <span className="text-[#666]">/</span>
        <Link href="/dashboard/settings" className="text-sm text-[#ccc] hover:text-white no-underline transition-colors">Settings</Link>
        <span className="text-[#666]">/</span>
        <span className="text-sm text-white font-medium">Artificial Intelligence</span>
      </nav>

      <div className="border-b border-white/[0.06] bg-[rgba(20,33,61,0.3)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2 -mb-px">
            {TABS.map(tab => {
              const isActive = pathname === tab.href || (tab.href !== '/dashboard/settings/ai' && pathname.startsWith(tab.href + '/'));
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-all duration-150 ${
                    isActive
                      ? 'text-[var(--hp-primary)] border-[var(--hp-primary)] bg-[var(--hp-primary)]/5'
                      : 'text-[#888] border-transparent hover:text-[#ccc] hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

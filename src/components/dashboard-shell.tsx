'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authFetch, isAuthenticated } from '@/lib/auth-client';
import { CommandPaletteTrigger } from '@/components/command-palette';
import { NotificationCenter } from '@/components/notification-center';
import { usePermissions } from '@/hooks/use-permissions';

interface UserProfile {
  email: string;
  role: string;
  client_name?: string;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission, is_superadmin, loading: permsLoading } = usePermissions();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.data) setProfile(d.data);
      })
      .catch(() => {});
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/auth/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen font-sans antialiased relative">
      {/* Nav */}
      <nav className="hp-nav">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center px-4 sm:px-8 h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <div className="w-8 h-8 rounded-[var(--hp-radius-sm)] bg-gradient-to-br from-[var(--hp-primary)] to-[var(--hp-primary-dark)] flex items-center justify-center font-extrabold text-xs text-white">H</div>
            <span className="text-lg font-bold tracking-tight hidden sm:inline">
              <span className="text-[var(--hp-primary)]">Hey</span>
              <span className="text-[var(--hp-text)]">Pass</span>
            </span>
          </Link>

          {/* Center nav */}
          <div className="hidden md:flex items-center gap-1">
            {(is_superadmin || hasPermission('events.view')) && (
              <Link
                href="/dashboard"
                className={`hp-nav-item ${isActive('/dashboard') && !isActive('/dashboard/settings') && !isActive('/dashboard/events') ? 'active' : ''}`}
              >
                Events
              </Link>
            )}
            {(is_superadmin || hasPermission('settings.view')) && (
              <Link
                href="/dashboard/settings"
                className={`hp-nav-item ${isActive('/dashboard/settings') ? 'active' : ''}`}
              >
                Settings
              </Link>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <CommandPaletteTrigger />
            <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />

            {/* Profile menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--hp-radius-sm)] hover:bg-[var(--hp-surface-hover)] transition-colors">
                <div className="w-7 h-7 rounded-full bg-[var(--hp-primary)]/15 flex items-center justify-center text-[var(--hp-primary)] text-xs font-semibold">
                  {profile?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="text-sm text-[var(--hp-text-secondary)] hidden sm:inline max-w-[120px] truncate">
                  {profile?.email || 'User'}
                </span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-[var(--hp-bg-elevated)] border border-[var(--hp-border)] rounded-[var(--hp-radius-md)] shadow-[var(--hp-shadow-lg)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-[var(--hp-duration-fast)] z-[var(--hp-z-dropdown)]">
                <div className="px-3 py-2 border-b border-[var(--hp-border)]">
                  <p className="text-xs font-medium text-[var(--hp-text)] truncate">{profile?.email}</p>
                  <p className="text-[10px] text-[var(--hp-text-muted)] mt-0.5">{profile?.role || 'Member'}</p>
                </div>
                <Link href="/dashboard/settings" className="block px-3 py-2 text-sm text-[var(--hp-text-secondary)] hover:bg-[var(--hp-surface-hover)] hover:text-[var(--hp-text)] no-underline transition-colors">
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--hp-text-secondary)] hover:bg-[var(--hp-surface-hover)] hover:text-[var(--hp-text)] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] hover:bg-[var(--hp-surface-hover)] rounded-[var(--hp-radius-sm)] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--hp-glass-border)] px-4 py-2 animate-[hp-slide-down_0.15s_var(--hp-ease-out)]">
            <Link href="/dashboard" className="block py-2 text-sm text-[var(--hp-text-secondary)] hover:text-[var(--hp-text)] no-underline" onClick={() => setMobileMenuOpen(false)}>
              Events
            </Link>
            <Link href="/dashboard/settings" className="block py-2 text-sm text-[var(--hp-text-secondary)] hover:text-[var(--hp-text)] no-underline" onClick={() => setMobileMenuOpen(false)}>
              Settings
            </Link>
            <button onClick={handleSignOut} className="block py-2 text-sm text-[var(--hp-text-secondary)] hover:text-[var(--hp-text)]">
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}

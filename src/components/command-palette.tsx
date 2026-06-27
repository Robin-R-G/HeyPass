'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, FileText, Settings, CreditCard, Link2, Award, Hash, ArrowRight, X } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'event' | 'participant' | 'certificate' | 'organization' | 'team' | 'sponsor' | 'invoice' | 'setting' | 'page';
  href: string;
  icon: React.ReactNode;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAVIGATION_ITEMS = [
  { title: 'Dashboard', href: '/dashboard', icon: <Calendar size={16} />, type: 'page' as const },
  { title: 'New Event', href: '/dashboard/events/new', icon: <Calendar size={16} />, type: 'page' as const },
  { title: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} />, type: 'setting' as const },
  { title: 'Team', href: '/dashboard/settings/team', icon: <Users size={16} />, type: 'setting' as const },
  { title: 'Branding', href: '/dashboard/settings/branding', icon: <FileText size={16} />, type: 'setting' as const },
  { title: 'Payments', href: '/dashboard/settings/payments', icon: <CreditCard size={16} />, type: 'setting' as const },
  { title: 'Billing', href: '/dashboard/settings/billing', icon: <CreditCard size={16} />, type: 'setting' as const },
  { title: 'Domains', href: '/dashboard/settings/domains', icon: <Link2 size={16} />, type: 'setting' as const },
  { title: 'API Keys', href: '/dashboard/settings/api-keys', icon: <Hash size={16} />, type: 'setting' as const },
  { title: 'Webhooks', href: '/dashboard/settings/webhooks', icon: <Link2 size={16} />, type: 'setting' as const },
  { title: 'WhatsApp', href: '/dashboard/settings/whatsapp', icon: <FileText size={16} />, type: 'setting' as const },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        setResults(Array.isArray(data.data) ? data.data : []);
      } catch {
        // Fallback: filter navigation items
        const filtered = NAVIGATION_ITEMS.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase())
        ).map((item, i) => ({
          id: `nav-${i}`,
          title: item.title,
          type: item.type,
          href: item.href,
          icon: item.icon,
        }));
        setResults(filtered);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // If no search API, show filtered nav items
  useEffect(() => {
    if (query && results.length === 0 && !loading) {
      const filtered = NAVIGATION_ITEMS.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
      ).map((item, i) => ({
        id: `nav-${i}`,
        title: item.title,
        type: item.type,
        href: item.href,
        icon: item.icon,
      }));
      setResults(filtered);
    }
  }, [query, results.length, loading]);

  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    router.push(href);
  }, [onOpenChange, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].href);
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [results, selectedIndex, handleSelect, onOpenChange]);

  if (!open) return null;

  const displayResults = query.trim() ? results : NAVIGATION_ITEMS.slice(0, 6).map((item, i) => ({
    id: `nav-${i}`,
    title: item.title,
    type: item.type,
    href: item.href,
    icon: item.icon,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-[560px] mx-4 bg-[#0a0a0a] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <Search size={18} className="text-[#666] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search events, people, settings..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-[#555] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[#666] bg-white/[0.04] border border-white/[0.08] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {loading && (
            <div className="px-5 py-8 text-center text-[#666] text-sm">Searching...</div>
          )}

          {!loading && displayResults.length === 0 && query.trim() && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-[#888]">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-[#666] mt-1">Try a different search term</p>
            </div>
          )}

          {!loading && displayResults.length > 0 && (
            <>
              {!query.trim() && (
                <div className="px-5 py-2 text-[10px] font-semibold text-[#666] uppercase tracking-wider">
                  Quick Navigation
                </div>
              )}
              {displayResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                    index === selectedIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 text-[#888]">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-[#666] truncate">{result.subtitle}</div>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-[#555] shrink-0" />
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-[#666]">
          <span><kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#888] hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[#666] bg-white/[0.04] border border-white/[0.08] rounded ml-2">
          <span className="mr-0.5">⌘</span>K
        </kbd>
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

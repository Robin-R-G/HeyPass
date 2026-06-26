'use client';

import Link from 'next/link';

const FEATURES = [
  { icon: '📋', title: 'Smart Registration', desc: 'Custom forms with conditional logic, multi-step flows, file uploads, and real-time analytics.' },
  { icon: '📱', title: 'QR Check-In/Out', desc: 'Instant QR scanning, multi-gate support, offline mode, and live attendance tracking.' },
  { icon: '🎓', title: 'Auto Certificates', desc: 'Generate branded PDFs in bulk, share via link, and verify authenticity instantly.' },
  { icon: '📊', title: 'Live Analytics', desc: 'Revenue reports, attendance heatmaps, session insights, and one-click CSV exports.' },
  { icon: '🏷️', title: 'White Label', desc: 'Custom domains, logo overrides, per-event theming, and branded email templates.' },
  { icon: '⚡', title: 'Works Offline', desc: 'Queue scans without internet and sync automatically when reconnected.' },
];

const STATS = [
  { value: '10K+', label: 'Events Managed' },
  { value: '500K+', label: 'Registrations' },
  { value: '99.9%', label: 'Uptime' },
  { value: '50+', label: 'Colleges & Orgs' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col text-hp-text font-sans antialiased relative">
      <div className="hp-bg-gradient" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[rgba(20,33,61,0.85)] backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center no-underline">
            <span className="text-xl font-bold tracking-[-0.03em]">
              <span className="text-[#FCA311]">Hey</span>
              <span className="text-white">Pass</span>
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/verify" className="text-sm font-medium text-[#999] hover:text-white transition-colors">Verify</Link>
            <Link href="/auth/login" className="text-sm font-medium text-[#999] hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/register" className="hp-btn hp-btn-primary text-sm font-semibold px-5 py-2 rounded-full">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 pt-24 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-[#FCA311]/10 border border-[#FCA311]/20 rounded-full px-4 py-1.5 mb-7">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FCA311] shadow-[0_0_8px_#FCA311]" />
          <span className="text-xs font-semibold text-[#FCA311] tracking-wide">Now in Public Beta</span>
        </div>

        <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-[800] leading-[1.02] mb-6 max-w-[800px] tracking-[-0.04em]">
          The Event Platform<br />
          <span className="bg-gradient-to-r from-[#FCA311] via-[#e09800] to-[#FCA311] bg-clip-text text-transparent">That Just Works</span>
        </h1>

        <p className="text-lg text-[#999] max-w-[540px] leading-relaxed mb-10">
          Registration, check-in, certificates, analytics — everything you need to run professional events. Built for colleges, conferences, and communities.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/auth/register" className="hp-btn hp-btn-primary text-base font-semibold px-8 py-3.5 rounded-full">
            Start for Free
          </Link>
          <Link href="/verify" className="hp-btn hp-btn-secondary text-base font-medium px-8 py-3.5 rounded-full">
            Verify a Certificate
          </Link>
        </div>
      </main>

      {/* Stats */}
      <section className="border-y border-white/[0.08] bg-[rgba(20,33,61,0.2)] backdrop-blur-lg py-12 px-5 relative z-10">
        <div className="max-w-[1000px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-[2rem] sm:text-[2.5rem] font-[800] tracking-[-0.02em] leading-tight">
                <span className="text-[#FCA311]">{s.value}</span>
              </div>
              <div className="text-xs font-semibold text-[#777] mt-1 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28 px-5 relative z-10">
        <div className="max-w-[1080px] mx-auto">
          <p className="text-xs font-semibold text-[#FCA311] text-center mb-3 tracking-[0.15em] uppercase">Core Capabilities</p>
          <h2 className="text-[clamp(2rem,5vw,3rem)] font-[800] text-center mb-2 tracking-[-0.03em]">
            Everything you need.
          </h2>
          <p className="text-center text-[#999] text-base max-w-[460px] mx-auto mb-16 leading-relaxed">
            One powerful, unified platform to orchestrate your event lifecycle without juggling dozens of tools.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="hp-glass-card p-8 flex flex-col gap-4">
                <div className="text-[2.25rem] leading-none">{f.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1.5 tracking-[-0.02em]">{f.title}</h3>
                  <p className="text-sm text-[#999] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-5 text-center relative z-10 border-t border-white/[0.08]"
        style={{ background: 'radial-gradient(circle at center, rgba(252,163,17,0.05) 0%, transparent 60%)' }}>
        <div className="hp-glass-card max-w-[800px] mx-auto p-10 sm:p-12 flex flex-col items-center gap-5">
          <h2 className="text-[clamp(1.6rem,4vw,2.5rem)] font-[800] tracking-[-0.03em] leading-tight">
            Ready to run better events?
          </h2>
          <p className="text-[#999] text-base max-w-[450px] leading-relaxed">
            Free to start. No credit card required. Set up your organization and launch your first event in under 5 minutes.
          </p>
          <Link href="/auth/register" className="hp-btn hp-btn-primary text-base font-semibold px-8 py-3.5 rounded-full mt-2">
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-10 border-t border-white/[0.08] bg-black/40 relative z-10">
        <div className="max-w-[1080px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-lg font-bold tracking-[-0.02em]">
              <span className="text-[#FCA311]">Hey</span>
              <span className="text-white">Pass</span>
            </span>
            <p className="text-xs text-[#666] mt-1">
              Developed from Kerala with &#10084; &middot; Robin R G &middot; &copy; 2026
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-sm text-[#777] hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/register" className="text-sm text-[#777] hover:text-white transition-colors">Sign Up</Link>
            <Link href="/verify" className="text-sm text-[#777] hover:text-white transition-colors">Verify</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

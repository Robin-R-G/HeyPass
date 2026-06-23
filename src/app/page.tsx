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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--hp-text)', fontFamily: 'var(--hp-font-sans)', position: 'relative' }}>
      
      {/* Animated Ambient Background */}
      <div className="hp-bg-gradient" />

      {/* Sticky Navigation Bar */}
      <nav className="hp-nav" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2.5rem',
        borderBottom: '1px solid var(--hp-border)',
        zIndex: 50,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="hp-gradient-text hp-text-glow" style={{
            fontSize: '1.40rem', fontWeight: 700,
            letterSpacing: '-0.03em',
          }}>HeyPass</span>
        </Link>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/verify" className="hp-nav-item" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Verify</Link>
          <Link href="/auth/login" className="hp-nav-item" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Sign In</Link>
          <Link href="/auth/register" className="hp-btn hp-btn-primary" style={{
            padding: '0.5rem 1.25rem', borderRadius: 'var(--hp-radius-full)',
            textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="hp-animate-fade-in" style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '8rem 2rem 6rem', textAlign: 'center', position: 'relative', zIndex: 10
      }}>
        
        {/* Floating Tag */}
        <div className="hp-badge hp-badge-primary hp-animate-float" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          borderRadius: 'var(--hp-radius-full)', padding: '0.4rem 1.1rem', marginBottom: '2rem',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--hp-primary)', boxShadow: '0 0 10px var(--hp-primary)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em' }}>Now in Public Beta</span>
        </div>

        {/* Hero Title */}
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 800, lineHeight: 1.02,
          marginBottom: '1.75rem', maxWidth: '850px', letterSpacing: '-0.04em',
        }}>
          The Event Platform <br />
          <span className="hp-gradient-text hp-text-glow">That Just Works</span>
        </h1>

        {/* Hero Subtitle */}
        <p style={{
          fontSize: '1.2rem', color: 'var(--hp-text-secondary)', maxWidth: '560px',
          lineHeight: 1.6, marginBottom: '3rem', fontWeight: 400, letterSpacing: '-0.01em',
        }}>
          Registration, check-in, certificates, analytics — everything you need to run professional events. Built for colleges, conferences, and communities.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/register" className="hp-btn hp-btn-primary" style={{
            padding: '1rem 2.25rem', borderRadius: 'var(--hp-radius-full)',
            textDecoration: 'none', fontWeight: 600, fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}>Start for Free</Link>
          <Link href="/verify" className="hp-btn hp-btn-secondary" style={{
            padding: '1rem 2.25rem', borderRadius: 'var(--hp-radius-full)',
            textDecoration: 'none', fontWeight: 500, fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}>Verify a Certificate</Link>
        </div>
      </main>

      {/* Stats Section */}
      <section style={{
        borderTop: '1px solid var(--hp-border)',
        borderBottom: '1px solid var(--hp-border)',
        background: 'rgba(20, 33, 61, 0.2)',
        backdropFilter: 'blur(10px)',
        padding: '3rem 2rem',
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: '1000px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem',
          textAlign: 'center',
        }}>
          {STATS.map((s, idx) => (
            <div key={s.label} className="hp-animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="hp-gradient-text" style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--hp-text-muted)', marginTop: '0.35rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '8rem 2rem 6rem', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <p style={{
            fontSize: '0.8rem', color: 'var(--hp-primary)', textAlign: 'center', marginBottom: '0.85rem',
            fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>Core Capabilities</p>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 800,
            textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.03em',
          }}>
            Everything you need.
          </h2>
          <p style={{
            textAlign: 'center', color: 'var(--hp-text-secondary)', fontSize: '1.05rem',
            marginBottom: '5rem', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
            lineHeight: 1.5,
          }}>
            One powerful, unified platform to orchestrate your event lifecycle without juggling dozens of tools.
          </p>

          {/* Features Grid using Glass Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem',
          }}>
            {FEATURES.map((f, idx) => (
              <div key={f.title} className="hp-glass-card hp-animate-fade-in" style={{
                padding: '2.5rem',
                textAlign: 'left',
                animationDelay: `${idx * 0.15}s`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                <div style={{ fontSize: '2.25rem', lineHeight: 1 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--hp-text)', letterSpacing: '-0.02em' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--hp-text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '7rem 2rem', textAlign: 'center', position: 'relative', zIndex: 10,
        borderTop: '1px solid var(--hp-border)',
        background: 'radial-gradient(circle at center, rgba(252, 163, 17, 0.05) 0%, transparent 60%)'
      }}>
        <div className="hp-glass" style={{
          maxWidth: '800px', margin: '0 auto', padding: '4.5rem 2.5rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'
        }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1.2
          }}>
            Ready to run better events?
          </h2>
          <p style={{ color: 'var(--hp-text-secondary)', fontSize: '1rem', maxWidth: '450px', lineHeight: 1.6 }}>
            Free to start. No credit card required. Set up your organization and launch your first event in under 5 minutes.
          </p>
          <Link href="/auth/register" className="hp-btn hp-btn-primary" style={{
            padding: '1rem 2.5rem', borderRadius: 'var(--hp-radius-full)',
            textDecoration: 'none', fontWeight: 600, fontSize: '1rem',
            boxShadow: '0 0 30px var(--hp-primary-glow)',
            marginTop: '0.5rem'
          }}>Create Your Account</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '3rem 2.5rem',
        borderTop: '1px solid var(--hp-border)',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: '1080px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1.5rem',
        }}>
          <div>
            <span className="hp-gradient-text" style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.020em' }}>HeyPass</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--hp-text-muted)', marginTop: '0.35rem' }}>
              Developed from Kerala with ❤ · Robin R G · &copy; 2026
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/auth/login" className="hp-nav-item" style={{ color: 'var(--hp-text-muted)', fontSize: '0.85rem' }}>Sign In</Link>
            <Link href="/auth/register" className="hp-nav-item" style={{ color: 'var(--hp-text-muted)', fontSize: '0.85rem' }}>Sign Up</Link>
            <Link href="/verify" className="hp-nav-item" style={{ color: 'var(--hp-text-muted)', fontSize: '0.85rem' }}>Verify</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

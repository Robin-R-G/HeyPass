'use client';

import Link from 'next/link';

const FEATURES = [
  { icon: '📋', title: 'Registration', desc: 'Custom forms with conditional logic, file uploads, and real-time analytics.' },
  { icon: '📱', title: 'Check-In/Out', desc: 'QR scanning, multi-gate support, and live attendance dashboards.' },
  { icon: '🎓', title: 'Certificates', desc: 'Auto-generated PDFs with branded templates, verification, and share links.' },
  { icon: '📊', title: 'Analytics', desc: 'Revenue reports, attendance insights, and exportable CSV data.' },
  { icon: '🏷️', title: 'White Label', desc: 'Custom domains, branding overrides, and per-event theming.' },
  { icon: '⚡', title: 'Offline Ready', desc: 'Queue scans offline and sync automatically when reconnected.' },
];

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#000', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2.5rem',
        borderBottom: '1px solid rgba(229,229,229,0.06)',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontSize: '1.25rem', fontWeight: 600, color: '#fff',
            letterSpacing: '-0.025em',
          }}>HeyPass</span>
        </Link>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/auth/register" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 400, letterSpacing: '-0.01em' }}>Register</Link>
          <Link href="/verify" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 400, letterSpacing: '-0.01em' }}>Verify</Link>
          <Link href="/dashboard" style={{
            background: '#FCA311', color: '#000',
            padding: '0.45rem 1rem', borderRadius: '980px',
            textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500,
          }}>Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '8rem 2rem 6rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle gradient orbs */}
        <div style={{
          position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(252,163,17,0.06) 0%, transparent 70%)',
          top: '-15%', left: '-10%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(252,163,17,0.04) 0%, transparent 70%)',
          bottom: '-10%', right: '-5%', pointerEvents: 'none',
        }} />

        <p style={{
          fontSize: '0.75rem', color: '#888', marginBottom: '1.5rem',
          fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Event Operations Platform
        </p>

        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 700, lineHeight: 1.05,
          marginBottom: '1.5rem', maxWidth: '800px', letterSpacing: '-0.04em',
        }}>
          Run Events{' '}
          <span style={{ color: '#FCA311' }}>Smarter</span>
        </h1>

        <p style={{
          fontSize: '1.15rem', color: '#888', maxWidth: '480px',
          lineHeight: 1.6, marginBottom: '3rem', fontWeight: 400, letterSpacing: '-0.01em',
        }}>
          Registration, check-in, certificates, analytics — all in one platform built for colleges, conferences, and communities.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{
            background: '#FCA311', color: '#000',
            padding: '0.85rem 2rem', borderRadius: '980px',
            textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem',
            letterSpacing: '-0.01em',
          }}>Get Started</Link>
          <Link href="/verify" style={{
            background: 'transparent', border: '1px solid rgba(229,229,229,0.2)',
            color: '#E5E5E5', padding: '0.85rem 2rem', borderRadius: '980px',
            textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem',
            letterSpacing: '-0.01em',
          }}>Verify Certificate</Link>
        </div>
      </main>

      {/* Features */}
      <section style={{
        padding: '6rem 2rem',
        borderTop: '1px solid rgba(229,229,229,0.06)',
      }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700,
            textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.03em',
          }}>
            Everything you need.
          </h2>
          <p style={{
            textAlign: 'center', color: '#888', fontSize: '1rem',
            marginBottom: '4rem', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto',
            letterSpacing: '-0.01em',
          }}>
            From registration to certificates. One platform, zero hassle.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px',
            background: 'rgba(229,229,229,0.06)', borderRadius: '20px', overflow: 'hidden',
          }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                background: '#000', padding: '2rem',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: '#fff', letterSpacing: '-0.02em' }}>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '3rem 2rem',
        borderTop: '1px solid rgba(229,229,229,0.06)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
          HeyPass Event Operations Platform
        </p>
        <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.35rem' }}>
          Developed from Kerala with ❤
        </p>
        <p style={{ fontSize: '0.7rem', color: '#444' }}>
          &copy; 2026 Robin R G. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}

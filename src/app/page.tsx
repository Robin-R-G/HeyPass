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

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/verify" style={{ color: '#888', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 400, transition: 'color 0.15s' }}>Verify</Link>
          <Link href="/auth/login" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>Sign In</Link>
          <Link href="/auth/register" style={{
            background: '#FCA311', color: '#000',
            padding: '0.5rem 1.1rem', borderRadius: '980px',
            textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '7rem 2rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
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

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(252,163,17,0.08)', border: '1px solid rgba(252,163,17,0.15)',
          borderRadius: '980px', padding: '0.4rem 1rem', marginBottom: '2rem',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FCA311' }} />
          <span style={{ fontSize: '0.75rem', color: '#FCA311', fontWeight: 500 }}>Now in Public Beta</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5rem)', fontWeight: 700, lineHeight: 1.05,
          marginBottom: '1.5rem', maxWidth: '750px', letterSpacing: '-0.04em',
        }}>
          The Event Platform{' '}
          <span style={{ color: '#FCA311' }}>That Just Works</span>
        </h1>

        <p style={{
          fontSize: '1.1rem', color: '#888', maxWidth: '500px',
          lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 400, letterSpacing: '-0.01em',
        }}>
          Registration, check-in, certificates, analytics — everything you need to run professional events, built for colleges, conferences, and communities.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/register" style={{
            background: '#FCA311', color: '#000',
            padding: '0.85rem 2rem', borderRadius: '980px',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
            letterSpacing: '-0.01em',
          }}>Start for Free</Link>
          <Link href="/verify" style={{
            background: 'transparent', border: '1px solid rgba(229,229,229,0.15)',
            color: '#E5E5E5', padding: '0.85rem 2rem', borderRadius: '980px',
            textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem',
            letterSpacing: '-0.01em',
          }}>Verify a Certificate</Link>
        </div>
      </main>

      {/* Stats Bar */}
      <section style={{
        borderTop: '1px solid rgba(229,229,229,0.06)',
        borderBottom: '1px solid rgba(229,229,229,0.06)',
        padding: '2.5rem 2rem',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem',
          textAlign: 'center',
        }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FCA311', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <p style={{
            fontSize: '0.75rem', color: '#FCA311', textAlign: 'center', marginBottom: '0.75rem',
            fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>Features</p>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700,
            textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '-0.03em',
          }}>
            Everything you need.
          </h2>
          <p style={{
            textAlign: 'center', color: '#888', fontSize: '0.95rem',
            marginBottom: '4rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            One platform to run it all. No more juggling 5 different tools.
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

      {/* CTA Section */}
      <section style={{
        padding: '5rem 2rem', textAlign: 'center',
        borderTop: '1px solid rgba(229,229,229,0.06)',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700,
          marginBottom: '1rem', letterSpacing: '-0.03em',
        }}>
          Ready to run better events?
        </h2>
        <p style={{ color: '#888', fontSize: '0.95rem', marginBottom: '2rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
          Free to start. No credit card required. Set up in under 5 minutes.
        </p>
        <Link href="/auth/register" style={{
          display: 'inline-block',
          background: '#FCA311', color: '#000',
          padding: '0.85rem 2.5rem', borderRadius: '980px',
          textDecoration: 'none', fontWeight: 600, fontSize: '1rem',
        }}>Create Your Account</Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '3rem 2rem',
        borderTop: '1px solid rgba(229,229,229,0.06)',
      }}>
        <div style={{
          maxWidth: '980px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>HeyPass</span>
            <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>
              Developed from Kerala with ❤ · Robin R G · &copy; 2026
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/auth/login" style={{ color: '#888', textDecoration: 'none', fontSize: '0.8rem' }}>Sign In</Link>
            <Link href="/auth/register" style={{ color: '#888', textDecoration: 'none', fontSize: '0.8rem' }}>Sign Up</Link>
            <Link href="/verify" style={{ color: '#888', textDecoration: 'none', fontSize: '0.8rem' }}>Verify</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

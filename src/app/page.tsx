'use client';

import Link from 'next/link';

const FEATURES = [
  {
    icon: '📋',
    title: 'Registration',
    desc: 'Custom forms with conditional logic, file uploads, and real-time analytics.',
  },
  {
    icon: '📱',
    title: 'Check-In/Out',
    desc: 'QR scanning, multi-gate support, and live attendance dashboards.',
  },
  {
    icon: '🎓',
    title: 'Certificates',
    desc: 'Auto-generated PDFs with branded templates, verification, and share links.',
  },
  {
    icon: '📊',
    title: 'Analytics',
    desc: 'Revenue reports, attendance insights, and exportable CSV data.',
  },
  {
    icon: '🏷️',
    title: 'White Label',
    desc: 'Custom domains, branding overrides, and per-event theming.',
  },
  {
    icon: '⚡',
    title: 'Offline Ready',
    desc: 'Queue scans offline and sync automatically when reconnected.',
  },
];

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#011C40',
      color: '#fff',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2.5rem',
        borderBottom: '1px solid rgba(167,235,242,0.08)',
        background: 'rgba(2,56,89,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #54ACBF, #26658C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#fff',
            boxShadow: '0 2px 12px rgba(84,172,191,0.3)',
          }}>H</div>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>HeyPass</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/register/slug" style={{
            color: '#9cb8c4',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            transition: 'color 0.15s',
          }}>Register</Link>
          <Link href="/verify" style={{
            color: '#9cb8c4',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            transition: 'color 0.15s',
          }}>Verify</Link>
          <Link href="/dashboard" style={{
            background: 'linear-gradient(135deg, #54ACBF, #26658C)',
            color: '#fff',
            padding: '0.6rem 1.4rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 12px rgba(84,172,191,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6rem 2rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(84,172,191,0.12) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(38,101,140,0.15) 0%, transparent 70%)',
          bottom: '-5%',
          right: '-5%',
          pointerEvents: 'none',
        }} />

        <div style={{
          padding: '0.4rem 1.2rem',
          borderRadius: '9999px',
          background: 'rgba(84,172,191,0.1)',
          border: '1px solid rgba(84,172,191,0.2)',
          fontSize: '0.8rem',
          color: '#A7EBF2',
          marginBottom: '2rem',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          White Label Event Operations Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.2rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          maxWidth: '750px',
          letterSpacing: '-0.03em',
        }}>
          Run Events{' '}
          <span style={{
            background: 'linear-gradient(135deg, #A7EBF2, #54ACBF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Smarter
          </span>
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: '#9cb8c4',
          maxWidth: '560px',
          lineHeight: 1.7,
          marginBottom: '3rem',
        }}>
          Registration, check-in, certificates, badges, analytics — all in one platform.
          Built for colleges, conferences, and communities.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{
            background: 'linear-gradient(135deg, #54ACBF, #26658C)',
            color: '#fff',
            padding: '0.9rem 2.2rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 20px rgba(84,172,191,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            Get Started
          </Link>
          <Link href="/verify" style={{
            background: 'rgba(167,235,242,0.06)',
            border: '1px solid rgba(167,235,242,0.15)',
            color: '#A7EBF2',
            padding: '0.9rem 2.2rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'background 0.15s, border-color 0.15s',
          }}>
            Verify Certificate
          </Link>
        </div>
      </main>

      {/* Features */}
      <section style={{
        padding: '5rem 2rem',
        borderTop: '1px solid rgba(167,235,242,0.06)',
        background: 'rgba(2,56,89,0.3)',
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}>
            Everything you need to{' '}
            <span style={{
              background: 'linear-gradient(135deg, #A7EBF2, #54ACBF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              run events
            </span>
          </h2>
          <p style={{
            textAlign: 'center',
            color: '#9cb8c4',
            fontSize: '0.95rem',
            marginBottom: '3rem',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            From registration to certificates — one platform, zero hassle.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                background: 'rgba(167,235,242,0.03)',
                border: '1px solid rgba(167,235,242,0.08)',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'left',
                transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  marginBottom: '0.75rem',
                }}>{f.icon}</div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: '#fff',
                }}>{f.title}</h3>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#9cb8c4',
                  lineHeight: 1.6,
                }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2.5rem 2rem',
        borderTop: '1px solid rgba(167,235,242,0.06)',
        textAlign: 'center',
        color: '#5a7a8a',
        fontSize: '0.8rem',
      }}>
        HeyPass — Event Operations Platform
      </footer>
    </div>
  );
}

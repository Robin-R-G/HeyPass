'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#fff',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
    }}>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 3rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
          }}>H</div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>HeyPass</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/register/slug" style={{
            color: '#a1a1aa',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}>Register</Link>
          <Link href="/verify" style={{
            color: '#a1a1aa',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}>Verify</Link>
          <Link href="/dashboard" style={{
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            color: '#fff',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}>Dashboard</Link>
        </div>
      </nav>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          background: 'rgba(129,140,248,0.1)',
          border: '1px solid rgba(129,140,248,0.2)',
          fontSize: '0.8rem',
          color: '#818cf8',
          marginBottom: '2rem',
        }}>
          White Label Event Operations Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          maxWidth: '800px',
        }}>
          Run Events{' '}
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Smarter
          </span>
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: '#a1a1aa',
          maxWidth: '600px',
          lineHeight: 1.7,
          marginBottom: '3rem',
        }}>
          Registration, check-in, certificates, badges, analytics, and more —
          all in one platform. Built for colleges, conferences, and communities.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            color: '#fff',
            padding: '0.875rem 2rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'transform 0.2s',
          }}>
            Get Started
          </Link>
          <Link href="/verify" style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '0.875rem 2rem',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}>
            Verify Certificate
          </Link>
        </div>
      </main>

      <section style={{
        padding: '4rem 2rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1000px',
          margin: '0 auto',
        }}>
          {[
            { title: 'Registration', desc: 'Multi-step forms with custom fields, conditional logic, and file uploads' },
            { title: 'Check-In/Out', desc: 'QR scanning, gate management, and real-time attendance tracking' },
            { title: 'Certificates', desc: 'Auto-generated PDFs with templates, verification, and share links' },
            { title: 'Analytics', desc: 'Live dashboards, revenue reports, and attendance insights' },
          ].map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'left',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#71717a', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        padding: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
        color: '#52525b',
        fontSize: '0.8rem',
      }}>
        HeyPass — Event Operations Platform
      </footer>
    </div>
  );
}

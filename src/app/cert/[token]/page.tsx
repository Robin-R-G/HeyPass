'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, ExternalLink, Shield, Clock, AlertTriangle } from 'lucide-react';

interface CertificateData {
  certificate_number: string;
  recipient_name: string;
  event_title: string;
  certificate_type: string;
  issued_at: string;
  organization_name: string;
  status: string;
  pdf_url: string | null;
  png_url: string | null;
}

interface ShareInfo {
  access_count: number;
  max_access: number;
  expires_at: string;
}

export default function CertSharePage() {
  const params = useParams();
  const token = params.token as string;
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/cert/share/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCertificate(data.data.certificate);
          setShareInfo(data.data.share_link);
        } else {
          setError(data.error || 'Certificate not found or link expired');
        }
      })
      .catch(() => setError('Failed to load certificate'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid #333', borderTopColor: '#6366F1',
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px',
          }} />
          <p>Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{
          background: '#1e1e2e',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          maxWidth: 440,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <AlertTriangle size={48} color="#e94560" style={{ marginBottom: 16 }} />
          <h1 style={{ color: '#fff', fontSize: 22, marginBottom: 8 }}>Certificate Not Available</h1>
          <p style={{ color: '#888', fontSize: 14 }}>{error || 'This certificate link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 24,
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 20, padding: '6px 16px', marginBottom: 16,
          }}>
            <Shield size={14} color="#6366F1" />
            <span style={{ color: '#6366F1', fontSize: 12, fontWeight: 600 }}>VERIFIED CERTIFICATE</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            {certificate.certificate_type || 'Certificate of Participation'}
          </h1>
          <p style={{ color: '#888', fontSize: 14 }}>{certificate.organization_name}</p>
        </div>

        {/* Certificate Card */}
        <div style={{
          background: '#1e1e2e',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          {/* Certificate Preview */}
          {certificate.png_url && (
            <div style={{
              background: '#fff',
              margin: 16,
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <img
                src={`/api/cert/image?path=${encodeURIComponent(certificate.png_url)}`}
                alt="Certificate"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          )}

          {/* Details */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 20,
            }}>
              <div>
                <p style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Recipient</p>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{certificate.recipient_name}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Event</p>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{certificate.event_title}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Certificate No.</p>
                <p style={{ color: '#fff', fontSize: 14, fontFamily: 'monospace' }}>{certificate.certificate_number}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Issued</p>
                <p style={{ color: '#fff', fontSize: 14 }}>
                  {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              {certificate.pdf_url && (
                <a
                  href={`/api/cert/download?number=${certificate.certificate_number}`}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#6366F1', color: '#000', padding: '12px 20px',
                    borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
                  }}
                >
                  <Download size={16} /> Download PDF
                </a>
              )}
              <a
                href={`/verify?method=number&value=${certificate.certificate_number}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '12px 20px',
                  borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <ExternalLink size={16} /> Verify
              </a>
            </div>
          </div>
        </div>

        {/* Share Link Info */}
        {shareInfo && (
          <div style={{
            marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 16, color: '#555', fontSize: 12,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> Expires {new Date(shareInfo.expires_at).toLocaleDateString()}
            </span>
            <span>{shareInfo.access_count}/{shareInfo.max_access} views</span>
          </div>
        )}
      </div>
    </div>
  );
}

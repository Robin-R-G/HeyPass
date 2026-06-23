'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Certificate {
  id: string;
  certificate_number: string;
  access_token: string;
  token_expires_at: string | null;
  pdf_url: string | null;
  png_url: string | null;
  status: string;
  issued_at: string;
  event_title: string;
  recipient_name: string;
  certificate_type: string;
  organization_name: string;
}

export default function CertificatesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [eventId]);

  async function fetchCertificates() {
    try {
      const res = await fetch(`/api/certificates?event_id=${eventId}`);
      const data = await res.json();
      setCertificates(data.certificates || []);
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(certId: string, type: 'pdf' | 'png') {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate_id: certId, type }),
      });
      const data = await res.json();
      if (data.download?.url) {
        window.open(data.download.url, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  }

  async function handleRevoke(certId: string) {
    const reason = prompt('Enter revocation reason:');
    if (!reason) return;

    try {
      await fetch(`/api/certificates/${certId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchCertificates();
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  }

  async function handleShareLink(certId: string) {
    try {
      const res = await fetch(`/api/certificates/${certId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_hours: 72 }),
      });
      const data = await res.json();
      if (data.share_link?.url) {
        navigator.clipboard.writeText(data.share_link.url);
        alert('Share link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share link failed:', err);
    }
  }

  const filteredCerts = certificates.filter(cert =>
    cert.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
    cert.recipient_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: certificates.length,
    generated: certificates.filter(c => c.status === 'generated').length,
    delivered: certificates.filter(c => c.status === 'delivered').length,
    downloaded: certificates.filter(c => c.status === 'downloaded').length,
    revoked: certificates.filter(c => c.status === 'revoked').length,
  };

  return (
    <div className="space-y-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#9cb8c4', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#9cb8c4', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Certificates</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Certificates</h1>
        <Button onClick={() => window.location.href = `/dashboard/events/${eventId}/certificates/generate`}>
          Generate Certificate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.generated}</div>
            <div className="text-sm text-muted-foreground">Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.delivered}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.downloaded}</div>
            <div className="text-sm text-muted-foreground">Downloaded</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.revoked}</div>
            <div className="text-sm text-muted-foreground">Revoked</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by certificate number or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Certificates ({filteredCerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No certificates found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate #</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCerts.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                    <TableCell>{cert.recipient_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cert.certificate_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        cert.status === 'revoked' ? 'destructive' :
                        cert.status === 'downloaded' ? 'default' :
                        'secondary'
                      }>
                        {cert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(cert.issued_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {cert.pdf_url && (
                          <Button size="sm" variant="outline" onClick={() => handleDownload(cert.id, 'pdf')}>
                            PDF
                          </Button>
                        )}
                        {cert.png_url && (
                          <Button size="sm" variant="outline" onClick={() => handleDownload(cert.id, 'png')}>
                            PNG
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleShareLink(cert.id)}>
                          Share
                        </Button>
                        {cert.status !== 'revoked' && (
                          <Button size="sm" variant="destructive" onClick={() => handleRevoke(cert.id)}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

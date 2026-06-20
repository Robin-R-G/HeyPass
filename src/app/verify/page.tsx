'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VerificationResult {
  valid: boolean;
  certificate_number?: string;
  recipient_name?: string;
  event_title?: string;
  certificate_type?: string;
  issued_at?: string;
  organization?: string;
  status?: string;
  verification_count?: number;
  pdf_url?: string;
}

export default function VerifyPage() {
  const [method, setMethod] = useState<'number' | 'url'>('number');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');

  async function handleVerify() {
    if (!input.trim()) {
      setError('Please enter a value');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = method === 'number'
        ? { certificate_number: input, method: 'number' }
        : { access_token: input, method: 'url' };

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.captcha_required) {
        setError('Too many requests. Please try again later.');
        return;
      }

      setResult(data);

      if (!data.valid) {
        setError('Certificate not found or has been revoked');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Certificate Verification</h1>
          <p className="text-gray-600 mt-2">Verify the authenticity of a certificate</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs value={method} onValueChange={(v) => { setMethod(v as any); setResult(null); setError(''); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="number">Certificate Number</TabsTrigger>
                <TabsTrigger value="url">Direct Link</TabsTrigger>
              </TabsList>

              <TabsContent value="number" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Certificate Number</Label>
                  <Input
                    placeholder="CERT-2026-000000-ABCDEF"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Verification Token</Label>
                  <Input
                    placeholder="Enter token from certificate URL"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleVerify}
              disabled={loading || !input.trim()}
              className="w-full mt-4"
            >
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </Button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {result?.valid && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">Valid</Badge>
                Certificate Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Certificate #</div>
                  <div className="font-mono">{result.certificate_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Recipient</div>
                  <div>{result.recipient_name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Event</div>
                  <div>{result.event_title}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div>{result.certificate_type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Organization</div>
                  <div>{result.organization}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Issued</div>
                  <div>{result.issued_at ? new Date(result.issued_at).toLocaleDateString() : '-'}</div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Verified {result.verification_count || 0} time(s)
                </div>
              </div>

              {result.pdf_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(result.pdf_url, '_blank')}
                >
                  Download Certificate
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

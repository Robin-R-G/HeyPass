'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/toast';

interface Template {
  id: string;
  name: string;
  type_id: string;
  layout: any;
}

interface CertificateType {
  id: string;
  name: string;
  slug: string;
}

export default function GenerateCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    template_id: '',
    type_id: '',
    name: '',
    email: '',
    event_title: '',
    event_date: '',
    custom_fields: {} as Record<string, string>,
  });

  useEffect(() => {
    fetchData();
  }, [eventId]);

  async function fetchData() {
    try {
      const [templatesRes, typesRes] = await Promise.all([
        fetch(`/api/certificate-templates?event_id=${eventId}`),
        fetch(`/api/certificate-types?event_id=${eventId}`),
      ]);

      const templatesData = await templatesRes.json();
      const typesData = await typesRes.json();

      setTemplates(templatesData.templates || []);
      setTypes(typesData.types || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!form.template_id || !form.type_id || !form.name) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          ...form,
        }),
      });

      const data = await res.json();
      if (data.certificate) {
        toast('Certificate generated successfully!', 'success');
        router.push(`/dashboard/events/${eventId}/certificates`);
      }
    } catch (err) {
      console.error('Generation failed:', err);
      toast('Failed to generate certificate', 'error');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Generate Certificate</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certificate Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template *</Label>
              <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Certificate Type *</Label>
              <Select value={form.type_id} onValueChange={(v) => setForm({ ...form, type_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recipient Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter recipient name"
            />
          </div>

          <div className="space-y-2">
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input
                value={form.event_title}
                onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                placeholder="Event title"
              />
            </div>

            <div className="space-y-2">
              <Label>Event Date</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? 'Generating...' : 'Generate Certificate'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
}

export default function SendNotificationPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    type: 'custom',
    template_id: '',
    recipient_email: '',
    recipient_name: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, [eventId]);

  async function fetchTemplates() {
    try {
      const res = await fetch(`/api/notifications/templates?event_id=${eventId}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleTemplateSelect(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setForm({
        ...form,
        template_id: templateId,
        subject: template.subject,
        body: template.body,
        type: template.type,
      });
    }
  }

  async function handleSend() {
    if (!form.recipient_email || !form.subject || !form.body) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          recipient_email: form.recipient_email,
          recipient_name: form.recipient_name || undefined,
          type: form.type,
          template_id: form.template_id || undefined,
          subject: form.subject,
          body: form.body,
        }),
      });

      if (res.ok) {
        alert('Notification sent successfully!');
        router.push(`/dashboard/events/${eventId}/notifications`);
      } else {
        const data = await res.json();
        alert(`Failed to send: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Send Notification</h1>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template (optional)</Label>
            <Select value={form.template_id} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recipient Email *</Label>
            <Input
              type="email"
              value={form.recipient_email}
              onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Recipient Name</Label>
            <Input
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Notification subject"
            />
          </div>

          <div className="space-y-2">
            <Label>Body * (HTML supported, use {'{{variable}}'} for placeholders)</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="<h1>Hello {{name}}!</h1><p>Your registration is confirmed.</p>"
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="pt-4">
            <Button onClick={handleSend} disabled={sending} className="w-full">
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

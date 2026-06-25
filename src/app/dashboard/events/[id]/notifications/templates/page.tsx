'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  is_active: boolean;
  variables: string[];
  created_at: string;
}

export default function TemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.id as string;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'custom',
    subject: '',
    body: '',
  });
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<string | null>(null);

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

  async function handleCreate() {
    if (!form.name || !form.subject || !form.body) {
      toast('Please fill in all fields', 'error');
      return;
    }

    try {
      const res = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          ...form,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setForm({ name: '', type: 'custom', subject: '', body: '' });
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  }

  async function handleUpdate() {
    if (!editingTemplate) return;

    try {
      const res = await fetch(`/api/notifications/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setEditingTemplate(null);
        setForm({ name: '', type: 'custom', subject: '', body: '' });
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  }

  async function executeDeleteTemplate(templateId: string) {
    try {
      await fetch(`/api/notifications/templates/${templateId}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }

  function openEdit(template: Template) {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      body: template.body,
    });
  }

  return (
    <div className="space-y-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Templates</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notification Templates</h1>
        <Button onClick={() => setShowCreate(true)}>Create Template</Button>
      </div>

      {/* Templates List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No templates yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'default' : 'secondary'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteTemplate(t.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Welcome Email"
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
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Welcome to {{event_title}}!"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (HTML, use {'{{variable}}'} for placeholders)</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">Update Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!confirmDeleteTemplate}
        title="Delete Template"
        message="Are you sure you want to delete this template?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteTemplate) executeDeleteTemplate(confirmDeleteTemplate);
          setConfirmDeleteTemplate(null);
        }}
        onCancel={() => setConfirmDeleteTemplate(null)}
      />
    </div>
  );
}

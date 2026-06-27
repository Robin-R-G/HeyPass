'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  response_code: number | null;
  attempts: number;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  'registration.created',
  'registration.confirmed',
  'registration.cancelled',
  'payment.completed',
  'payment.failed',
  'checkin.completed',
  'checkout.completed',
  'certificate.issued',
  'certificate.revoked',
  'ticket.issued',
  'ticket.validated',
];

export default function WebhooksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [form, setForm] = useState({ url: '', description: '', events: [] as string[] });
  const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState<string | null>(null);

  useEffect(() => { fetchEndpoints(); }, []);

  async function fetchEndpoints() {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setEndpoints(data.endpoints || []);
    } catch (err) {
      console.error('Failed to fetch endpoints:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeliveries(endpointId: string) {
    try {
      const res = await fetch(`/api/webhooks/deliveries?endpoint_id=${endpointId}`);
      const data = await res.json();
      setDeliveries(data.deliveries || []);
      setSelectedEndpoint(endpointId);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
    }
  }

  async function handleCreate() {
    if (!form.url || form.events.length === 0) {
      toast('URL and at least one event are required', 'error');
      return;
    }

    try {
      await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ url: '', description: '', events: [] });
      fetchEndpoints();
    } catch (err) {
      console.error('Failed to create endpoint:', err);
    }
  }

  async function handleTest(endpointId: string) {
    try {
      const res = await fetch(`/api/webhooks/${endpointId}/test`, { method: 'POST' });
      const data = await res.json();
      toast(data.success ? `Success: ${data.message}` : `Failed: ${data.message}`, data.success ? 'success' : 'error');
    } catch (err) {
      toast('Test failed', 'error');
    }
  }

  async function executeDeleteWebhook(endpointId: string) {
    try {
      await fetch(`/api/webhooks/${endpointId}`, { method: 'DELETE' });
      fetchEndpoints();
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  }

  function toggleEvent(event: string) {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  }

  return (
    <div className="min-h-screen text-white font-sans antialiased">
    <nav className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-[rgba(20,33,61,0.6)]">
      <button onClick={() => router.back()} className="text-sm text-[#ccc] hover:text-white transition-colors">&larr; Back</button>
      <span className="text-[#666]">/</span>
      <Link href="/dashboard" className="text-sm text-[#ccc] hover:text-white no-underline transition-colors">Events</Link>
      <span className="text-[#666]">/</span>
      <span className="text-sm text-white font-medium">Settings</span>
    </nav>
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <Button onClick={() => setShowCreate(true)}>Add Endpoint</Button>
      </div>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No webhook endpoints</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Failures</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className="font-mono text-sm max-w-[300px] truncate">{ep.url}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {ep.events.slice(0, 3).map(e => (
                          <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                        ))}
                        {ep.events.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{ep.events.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ep.is_active ? 'default' : 'secondary'}>
                        {ep.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ep.failure_count > 0 ? (
                        <Badge variant="danger">{ep.failure_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => fetchDeliveries(ep.id)}>
                          Deliveries
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleTest(ep.id)}>
                          Test
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmDeleteWebhook(ep.id)}>
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

      {/* Deliveries */}
      {selectedEndpoint && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No deliveries yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-sm">{d.event_type}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === 'delivered' ? 'default' : d.status === 'failed' ? 'destructive' : 'secondary'}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.response_code || '-'}</TableCell>
                      <TableCell>{d.attempts}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://your-server.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Production webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map(event => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full">Create Endpoint</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!confirmDeleteWebhook}
        title="Delete Webhook"
        message="Delete this webhook endpoint? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteWebhook) executeDeleteWebhook(confirmDeleteWebhook);
          setConfirmDeleteWebhook(null);
        }}
        onCancel={() => setConfirmDeleteWebhook(null)}
      />
    </div>
    </div>
  );
}

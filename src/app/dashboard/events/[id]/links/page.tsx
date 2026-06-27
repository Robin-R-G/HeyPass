'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { EventNav } from '@/components/event-nav';

interface Link {
  id: string;
  short_code: string;
  full_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  click_count: number;
  registration_count: number;
  is_active: boolean;
  created_at: string;
}

export default function LinksPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.id as string;
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ custom_code: '', utm_source: '', utm_medium: '', utm_campaign: '' });
  const [stats, setStats] = useState({ total_links: 0, total_clicks: 0, total_registrations: 0, conversion_rate: 0 });
  const [confirmDeleteLink, setConfirmDeleteLink] = useState<string | null>(null);

  useEffect(() => { fetchLinks(); }, [eventId]);

  async function fetchLinks() {
    try {
      const res = await fetch(`/api/links?event_id=${eventId}`);
      const data = await res.json();
      setLinks(data.links || []);

      // Calculate stats
      const all = data.links || [];
      const totalClicks = all.reduce((s: number, l: Link) => s + l.click_count, 0);
      const totalRegs = all.reduce((s: number, l: Link) => s + l.registration_count, 0);
      setStats({
        total_links: all.length,
        total_clicks: totalClicks,
        total_registrations: totalRegs,
        conversion_rate: totalClicks > 0 ? (totalRegs / totalClicks) * 100 : 0,
      });
    } catch (err) {
      console.error('Failed to fetch links:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          custom_code: form.custom_code || undefined,
          utm_source: form.utm_source || undefined,
          utm_medium: form.utm_medium || undefined,
          utm_campaign: form.utm_campaign || undefined,
        }),
      });
      const data = await res.json();
      if (data.link) {
        setShowCreate(false);
        setForm({ custom_code: '', utm_source: '', utm_medium: '', utm_campaign: '' });
        fetchLinks();
      }
    } catch (err) {
      console.error('Failed to create link:', err);
    }
  }

  async function executeDelete(linkId: string) {
    setConfirmDeleteLink(null);
    try {
      await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      fetchLinks();
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    toast('Link copied!', 'success');
  }

  return (
    <div className="space-y-6">
      <EventNav eventId={eventId} active="links" />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Registration Links</h1>
        <Button onClick={() => setShowCreate(true)}>Create Link</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total_links}</div>
            <div className="text-sm text-muted-foreground">Total Links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--hp-primary)]">{stats.total_clicks.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Clicks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.total_registrations.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Registrations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[var(--hp-primary)]">{stats.conversion_rate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Links Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No links yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{link.full_url}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {link.utm_source && <Badge variant="outline" className="text-xs">source: {link.utm_source}</Badge>}
                        {link.utm_medium && <Badge variant="outline" className="text-xs">medium: {link.utm_medium}</Badge>}
                        {link.utm_campaign && <Badge variant="outline" className="text-xs">campaign: {link.utm_campaign}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{link.click_count}</TableCell>
                    <TableCell className="font-mono">{link.registration_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyLink(link.full_url)}>
                          Copy
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmDeleteLink(link.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Registration Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Custom Code (optional)</Label>
              <Input
                value={form.custom_code}
                onChange={(e) => setForm({ ...form, custom_code: e.target.value })}
                placeholder="my-event"
              />
              <p className="text-xs text-muted-foreground">Leave empty for auto-generated code</p>
            </div>
            <div className="space-y-2">
              <Label>UTM Source</Label>
              <Input
                value={form.utm_source}
                onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
                placeholder="instagram"
              />
            </div>
            <div className="space-y-2">
              <Label>UTM Medium</Label>
              <Input
                value={form.utm_medium}
                onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
                placeholder="social"
              />
            </div>
            <div className="space-y-2">
              <Label>UTM Campaign</Label>
              <Input
                value={form.utm_campaign}
                onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                placeholder="spring-2026"
              />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmDeleteLink !== null}
        title="Delete Link"
        message="Are you sure you want to delete this link? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmDeleteLink && executeDelete(confirmDeleteLink)}
        onCancel={() => setConfirmDeleteLink(null)}
      />
    </div>
  );
}

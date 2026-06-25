'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Notification {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  type: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [stats, setStats] = useState({
    total: 0,
    by_status: {} as Record<string, number>,
    by_type: {} as Record<string, number>,
    today: 0,
  });

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [eventId, filter]);

  async function fetchNotifications() {
    try {
      const params = new URLSearchParams({ event_id: eventId });
      if (filter.type) params.set('type', filter.type);
      if (filter.status) params.set('status', filter.status);

      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`/api/notifications?event_id=${eventId}&limit=9999`);
      const data = await res.json();
      const all = data.notifications || [];

      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const today = new Date().toISOString().split('T')[0];

      for (const n of all) {
        byStatus[n.status] = (byStatus[n.status] || 0) + 1;
        byType[n.type] = (byType[n.type] || 0) + 1;
      }

      setStats({
        total: all.length,
        by_status: byStatus,
        by_type: byType,
        today: all.filter((n: Notification) => n.created_at.startsWith(today)).length,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'sent': case 'delivered': return 'default';
      case 'queued': case 'sending': return 'secondary';
      case 'opened': case 'clicked': return 'default';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'registration': return '🎉';
      case 'payment': return '💳';
      case 'certificate': return '📜';
      case 'reminder': return '⏰';
      case 'marketing': return '📢';
      case 'checkin': return '✅';
      default: return '📧';
    }
  }

  return (
    <div className="space-y-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Notifications</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/events/${eventId}/notifications/send`)}>
            Send Notification
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/events/${eventId}/notifications/templates`)}>
            Templates
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.by_status['sent'] || 0}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#FCA311]">{stats.today}</div>
            <div className="text-sm text-muted-foreground">Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.by_status['failed'] || 0}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filter.type} onValueChange={(v) => setFilter({ ...filter, type: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="registration">Registration</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="certificate">Certificate</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="checkin">Check-in</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No notifications</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <span className="mr-2">{getTypeIcon(n.type)}</span>
                      {n.type}
                    </TableCell>
                    <TableCell>
                      <div>{n.recipient_name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{n.recipient_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{n.subject}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(n.status)}>{n.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {n.sent_at ? new Date(n.sent_at).toLocaleString() : '-'}
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

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Radio, Plus, Send, Trash2, Eye, Clock, 
  Loader2, CheckCircle2, XCircle, AlertTriangle, Users
} from 'lucide-react';

interface Broadcast {
  id: string;
  name: string;
  status: string;
  target_type: string;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  whatsapp_templates?: { name: string };
}

interface Template {
  id: string;
  name: string;
  status: string;
  body_text: string;
}

export default function WhatsAppBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({
    name: '',
    template_id: '',
    target_type: 'all',
    scheduled_at: '',
  });

  useEffect(() => {
    fetchBroadcasts();
    fetchTemplates();
  }, []);

  async function fetchBroadcasts() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/broadcasts');
      const data = await res.json();
      if (data.success) {
        setBroadcasts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates');
    }
  }

  async function handleCreate() {
    if (!newBroadcast.name || !newBroadcast.template_id) return;

    try {
      const res = await fetch('/api/whatsapp/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBroadcast,
          scheduled_at: newBroadcast.scheduled_at || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowCreate(false);
        setNewBroadcast({ name: '', template_id: '', target_type: 'all', scheduled_at: '' });
        fetchBroadcasts();
      }
    } catch (err) {
      console.error('Failed to create broadcast');
    }
  }

  async function handleSend(id: string) {
    if (!confirm('Send this broadcast to all contacts?')) return;
    setSending(id);

    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${id}`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        fetchBroadcasts();
      }
    } catch (err) {
      console.error('Failed to send broadcast');
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this broadcast?')) return;

    try {
      await fetch(`/api/whatsapp/broadcasts/${id}`, { method: 'DELETE' });
      fetchBroadcasts();
    } catch (err) {
      console.error('Failed to delete broadcast');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'sent': return '#10B981';
      case 'sending': return '#F59E0B';
      case 'scheduled': return '#6366F1';
      case 'failed': return '#EF4444';
      case 'cancelled': return '#6B7280';
      default: return '#E5E5E5';
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#000' }}>Broadcasts</h1>
            <p className="text-sm" style={{ color: '#666' }}>Send messages to multiple contacts at once</p>
          </div>
          <Button onClick={() => setShowCreate(true)} style={{ background: 'var(--hp-primary)', color: '#000' }}>
            <Plus className="w-4 h-4 mr-2" /> New Broadcast
          </Button>
        </div>

        {/* Broadcasts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" style={{ color: 'var(--hp-primary)' }} />
              Broadcasts ({broadcasts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--hp-primary)' }} />
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#666' }}>
                No broadcasts yet. Create your first broadcast to reach your audience.
              </div>
            ) : (
              <div className="space-y-4">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold" style={{ color: '#000' }}>{broadcast.name}</h3>
                          <Badge style={{ background: getStatusColor(broadcast.status), color: 'white' }}>
                            {broadcast.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: '#666' }}>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {broadcast.total_contacts} contacts
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" /> {broadcast.sent_count} sent
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {broadcast.delivered_count} delivered
                          </span>
                          {broadcast.failed_count > 0 && (
                            <span className="flex items-center gap-1" style={{ color: '#EF4444' }}>
                              <XCircle className="w-3 h-3" /> {broadcast.failed_count} failed
                            </span>
                          )}
                          {broadcast.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Scheduled: {new Date(broadcast.scheduled_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {broadcast.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleSend(broadcast.id)}
                            disabled={sending === broadcast.id}
                            style={{ background: 'var(--hp-primary)', color: '#000' }}
                          >
                            {sending === broadcast.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(broadcast.id)}
                          style={{ color: '#EF4444' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Broadcast Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md" style={{ maxHeight: '90vh', overflow: 'auto' }}>
              <CardHeader>
                <CardTitle>Create Broadcast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Broadcast Name *</Label>
                  <Input
                    value={newBroadcast.name}
                    onChange={(e) => setNewBroadcast(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Event Reminder"
                  />
                </div>
                <div>
                  <Label>Template *</Label>
                  <select
                    value={newBroadcast.template_id}
                    onChange={(e) => setNewBroadcast(prev => ({ ...prev, template_id: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select a template</option>
                    {templates.filter(t => t.status === 'approved').map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <select
                    value={newBroadcast.target_type}
                    onChange={(e) => setNewBroadcast(prev => ({ ...prev, target_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Contacts</option>
                    <option value="tags">By Tags</option>
                    <option value="segments">By Segments</option>
                  </select>
                </div>
                <div>
                  <Label>Schedule (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={newBroadcast.scheduled_at}
                    onChange={(e) => setNewBroadcast(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={!newBroadcast.name || !newBroadcast.template_id} style={{ background: 'var(--hp-primary)', color: '#000' }}>
                    <Plus className="w-4 h-4 mr-2" /> Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

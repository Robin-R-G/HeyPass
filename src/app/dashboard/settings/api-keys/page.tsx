'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scope: string;
  permissions: string[];
  rate_limit: number;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    scope: 'full',
    rate_limit: 1000,
  });
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [confirmRegenKey, setConfirmRegenKey] = useState<string | null>(null);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      console.error('Failed to fetch keys:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name) { toast('Name is required', 'error'); return; }

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setNewKey(data.key);
      setShowCreate(false);
      fetchKeys();
    } catch (err) {
      console.error('Failed to create key:', err);
    }
  }

  async function executeDeleteKey() {
    const keyId = confirmDeleteKey;
    if (!keyId) return;
    setConfirmDeleteKey(null);
    try {
      await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' });
      fetchKeys();
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  }

  async function executeRegenKey() {
    const keyId = confirmRegenKey;
    if (!keyId) return;
    setConfirmRegenKey(null);
    try {
      const res = await fetch(`/api/api-keys/${keyId}/regenerate`, { method: 'POST' });
      const data = await res.json();
      setNewKey(data.key);
      fetchKeys();
    } catch (err) {
      console.error('Failed to regenerate key:', err);
    }
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      toast('API key copied to clipboard', 'success');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '1rem 1.5rem', borderBottom: '1px solid rgba(229,229,229,0.08)',
      background: 'rgba(20,33,61,0.6)',
    }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
      <span style={{ color: '#888888' }}>/</span>
      <Link href="/dashboard" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Events</Link>
      <span style={{ color: '#888888' }}>/</span>
      <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: 500 }}>Settings</span>
    </nav>
    <div className="space-y-6" style={{ padding: '1.5rem' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <Button onClick={() => setShowCreate(true)}>Create API Key</Button>
      </div>

      {/* New Key Display */}
      {newKey && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600">API Key Created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy this key now. It won't be shown again.
            </p>
            <div className="flex gap-2">
              <Input value={newKey} readOnly className="font-mono text-sm" />
              <Button onClick={copyKey}>Copy</Button>
            </div>
            <Button variant="outline" onClick={() => setNewKey(null)}>Done</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{keys.length}</div>
            <div className="text-sm text-muted-foreground">Total Keys</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{keys.filter(k => k.is_active).length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#FCA311]">{keys.filter(k => k.scope === 'full').length}</div>
            <div className="text-sm text-muted-foreground">Full Access</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{keys.filter(k => k.last_used_at).length}</div>
            <div className="text-sm text-muted-foreground">Recently Used</div>
          </CardContent>
        </Card>
      </div>

      {/* Keys Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No API keys yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                    <TableCell><Badge variant="outline">{key.scope}</Badge></TableCell>
                    <TableCell>{key.rate_limit.toLocaleString()}/hr</TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setConfirmRegenKey(key.id)}>
                          Regenerate
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteKey(key.id)}>
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
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Production API Key"
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Access</SelectItem>
                  <SelectItem value="event">Single Event</SelectItem>
                  <SelectItem value="read_only">Read Only</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate Limit (requests/hour)</Label>
              <Input
                type="number"
                value={form.rate_limit}
                onChange={(e) => setForm({ ...form, rate_limit: parseInt(e.target.value) || 1000 })}
              />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Key</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
      <ConfirmModal
        open={confirmDeleteKey !== null}
        title="Delete API Key"
        message="Delete this API key? This action cannot be undone and the key will stop working immediately."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDeleteKey}
        onCancel={() => setConfirmDeleteKey(null)}
      />
      <ConfirmModal
        open={confirmRegenKey !== null}
        title="Regenerate API Key"
        message="Regenerate this key? The old key will stop working immediately."
        confirmLabel="Regenerate"
        variant="danger"
        onConfirm={executeRegenKey}
        onCancel={() => setConfirmRegenKey(null)}
      />
    </div>
  );
}
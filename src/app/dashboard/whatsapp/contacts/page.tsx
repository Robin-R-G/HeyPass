'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Plus, Search, Filter, Trash2, Edit, 
  Loader2, Upload, Download, Tag, CheckCircle2, XCircle
} from 'lucide-react';

interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  status: string;
  lead_status: string;
  tags: string[];
  messages_sent: number;
  last_message_at?: string;
  created_at: string;
}

export default function WhatsAppContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({ phone: '', name: '', email: '', tags: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [statusFilter]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/whatsapp/contacts?${params}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newContact.phone) return;
    setSaving(true);

    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newContact.phone,
          name: newContact.name || undefined,
          email: newContact.email || undefined,
          tags: newContact.tags ? newContact.tags.split(',').map(t => t.trim()) : [],
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowAdd(false);
        setNewContact({ phone: '', name: '', email: '', tags: '' });
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to add contact');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, updates: Partial<Contact>) {
    try {
      const res = await fetch(`/api/whatsapp/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();

      if (data.success) {
        setEditing(null);
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to update contact');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return;

    try {
      await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' });
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact');
    }
  }

  function handleSearch() {
    fetchContacts();
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#000' }}>Contacts</h1>
            <p className="text-sm" style={{ color: '#666' }}>Manage your WhatsApp contact list</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAdd(true)} style={{ background: '#FCA311', color: '#000' }}>
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by phone or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: '#FCA311' }} />
              Contacts ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#FCA311' }} />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#666' }}>
                No contacts found. Add your first contact to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Phone</th>
                      <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Name</th>
                      <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Lead Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Tags</th>
                      <th className="text-left py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Messages</th>
                      <th className="text-right py-3 px-2 text-sm font-medium" style={{ color: '#666' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-mono text-sm">{contact.phone}</td>
                        <td className="py-3 px-2">{contact.name || '-'}</td>
                        <td className="py-3 px-2">
                          <Badge style={{
                            background: contact.status === 'active' ? '#10B981' : contact.status === 'blocked' ? '#EF4444' : '#6B7280',
                            color: 'white'
                          }}>
                            {contact.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge style={{ background: '#E5E5E5', color: '#000' }}>
                            {contact.lead_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 flex-wrap">
                            {(contact.tags || []).slice(0, 2).map((tag) => (
                              <Badge key={tag} style={{ background: '#FCA311', color: '#000' }} className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(contact.tags || []).length > 2 && (
                              <Badge style={{ background: '#E5E5E5', color: '#666' }} className="text-xs">
                                +{(contact.tags || []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">{contact.messages_sent || 0}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditing(contact)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(contact.id)}
                              style={{ color: '#EF4444' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Contact Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md" style={{ maxHeight: '90vh', overflow: 'auto' }}>
              <CardHeader>
                <CardTitle>Add Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contact Name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={newContact.tags}
                    onChange={(e) => setNewContact(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="vip, speaker, attendee"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={saving || !newContact.phone} style={{ background: '#FCA311', color: '#000' }}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Contact Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Edit Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={editing.phone} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editing.name || ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editing.email || ''}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div>
                  <Label>Lead Status</Label>
                  <select
                    value={editing.lead_status}
                    onChange={(e) => setEditing({ ...editing, lead_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button onClick={() => handleUpdate(editing.id, { name: editing.name, email: editing.email, status: editing.status, lead_status: editing.lead_status })} style={{ background: '#FCA311', color: '#000' }}>
                    Save Changes
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

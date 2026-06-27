'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { Loader2, Search, Plus, Trash2, Tag, X, Users } from 'lucide-react';

interface WhatsAppContact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'blocked';
  lead_status: string;
  tags: string[];
  messages_sent: number;
  messages_delivered: number;
  last_message_at: string | null;
  created_at: string;
}

export default function WhatsAppContactsPage() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ phone: '', name: '', email: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchContacts(); }, [page]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/contacts?page=${page}&limit=20&search=${search}`);
      const data = await res.json();
      if (data.data?.contacts) {
        setContacts(data.data.contacts);
        setTotal(data.data.total || 0);
      } else if (Array.isArray(data.data)) {
        setContacts(data.data);
        setTotal(data.data.length);
      }
    } catch {
      toast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newContact.phone) { toast('Phone is required', 'error'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      if (res.ok) {
        toast('Contact added', 'success');
        setShowAdd(false);
        setNewContact({ phone: '', name: '', email: '' });
        fetchContacts();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to add', 'error');
      }
    } catch {
      toast('Failed to add contact', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete Contact',
      description: 'Are you sure you want to delete this contact? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Contact deleted', 'success');
        fetchContacts();
      }
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Contacts</h2>
          <p className="text-sm text-[#888]">Manage your WhatsApp contact list.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="hp-btn hp-btn-primary flex items-center gap-2">
          <Plus size={14} /> Add Contact
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or phone..." className="hp-input pl-9" />
        </div>
      </div>

      {showAdd && (
        <div className="hp-glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Add Contact</h3>
            <button onClick={() => setShowAdd(false)} className="text-[#666] hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="+919876543210" className="hp-input" />
            <input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Name" className="hp-input" />
            <input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="Email" className="hp-input" />
          </div>
          <button onClick={handleAdd} disabled={adding} className="hp-btn hp-btn-primary mt-3">
            {adding ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add contacts to start building your WhatsApp audience."
          action={{ label: 'Add Contact', onClick: () => setShowAdd(true), icon: Plus }}
        />
      ) : (
        <div className="hp-glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Lead</th>
                <th className="text-left px-4 py-3 text-xs text-[#888] font-medium">Messages</th>
                <th className="text-right px-4 py-3 text-xs text-[#888] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name || 'Unknown'}</div>
                    {c.email && <div className="text-xs text-[#666]">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888]">{c.lead_status}</td>
                  <td className="px-4 py-3 text-xs">{c.messages_sent}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(c.id)} className="p-1 text-[#666] hover:text-[#ef4444]"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="hp-btn hp-btn-secondary text-xs">Prev</button>
          <span className="text-sm text-[#888] py-2 px-3">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="hp-btn hp-btn-secondary text-xs">Next</button>
        </div>
      )}
    </div>
  );
}

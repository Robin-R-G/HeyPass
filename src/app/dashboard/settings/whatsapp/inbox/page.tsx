'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { Loader2, Search, Send, User, Clock } from 'lucide-react';

interface Conversation {
  contact_id: string;
  contact_name: string | null;
  contact_phone: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  message_count: number;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  message_text: string;
  message_type: string;
  status: string;
  sent_at: string;
  template_name: string | null;
}

export default function WhatsAppInboxPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchConversations(); }, []);

  async function fetchConversations() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/inbox');
      const data = await res.json();
      setConversations(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(contactId: string) {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/whatsapp/inbox/${contactId}`);
      const data = await res.json();
      setMessages(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  }

  function handleSelectConversation(contactId: string) {
    setSelectedContact(contactId);
    fetchMessages(contactId);
  }

  async function handleSendReply() {
    if (!selectedContact || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/whatsapp/inbox/${selectedContact}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText('');
        fetchMessages(selectedContact);
        fetchConversations();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to send', 'error');
      }
    } catch {
      toast('Failed to send', 'error');
    } finally {
      setSending(false);
    }
  }

  const filtered = conversations.filter(c =>
    !search || c.contact_name?.toLowerCase().includes(search.toLowerCase()) || c.contact_phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-200px)]">
      <div>
        <h2 className="text-lg font-bold">Inbox</h2>
        <p className="text-sm text-[#888]">View and reply to WhatsApp conversations.</p>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation List */}
        <div className="w-[320px] shrink-0 hp-glass-card flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="hp-input pl-9 text-xs" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="text-[var(--hp-primary)] animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-[#666] text-xs">No conversations</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.contact_id}
                  onClick={() => handleSelectConversation(c.contact_id)}
                  className={`w-full text-left p-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                    selectedContact === c.contact_id ? 'bg-[var(--hp-primary)]/[0.06] border-l-2 border-l-[var(--hp-primary)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                      <User size={14} className="text-[#888]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{c.contact_name || c.contact_phone}</span>
                        {c.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[var(--hp-primary)] text-black text-[10px] font-bold flex items-center justify-center">{c.unread_count}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#666] truncate mt-0.5">{c.last_message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 hp-glass-card flex flex-col overflow-hidden">
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center text-[#666]">
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="text-[var(--hp-primary)] animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-[#666] text-xs">No messages yet</div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                        m.direction === 'outbound'
                          ? 'bg-[var(--hp-primary)]/20 text-white'
                          : 'bg-white/[0.06] text-[#ccc]'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{m.message_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#666]">{new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.direction === 'outbound' && <span className="text-[10px] text-[#666]">{m.status}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-white/[0.06]">
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    placeholder="Type a message..."
                    className="hp-input flex-1"
                  />
                  <button onClick={handleSendReply} disabled={sending || !replyText.trim()} className="hp-btn hp-btn-primary px-4">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

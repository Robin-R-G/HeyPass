'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { Loader2, BarChart3, TrendingUp, MessageCircle, Users, Radio } from 'lucide-react';

interface AnalyticsData {
  total_contacts: number;
  total_messages_sent: number;
  total_messages_delivered: number;
  total_messages_read: number;
  total_broadcasts: number;
  delivery_rate: number;
  read_rate: number;
  messages_last_7_days: { date: string; count: number }[];
}

export default function WhatsAppAnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => { fetchAnalytics(); }, []);

  async function fetchAnalytics() {
    try {
      const [contactsRes, broadcastsRes] = await Promise.all([
        fetch('/api/whatsapp/contacts?limit=1').then(r => r.json()).catch(() => ({ data: { total: 0 } })),
        fetch('/api/whatsapp/broadcasts').then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      const totalContacts = contactsRes.data?.total || 0;
      const broadcasts = Array.isArray(broadcastsRes.data) ? broadcastsRes.data : [];

      let totalSent = 0, totalDelivered = 0, totalRead = 0;
      broadcasts.forEach((b: { sent_count?: number; delivered_count?: number; read_count?: number }) => {
        totalSent += b.sent_count || 0;
        totalDelivered += b.delivered_count || 0;
        totalRead += b.read_count || 0;
      });

      setAnalytics({
        total_contacts: totalContacts,
        total_messages_sent: totalSent,
        total_messages_delivered: totalDelivered,
        total_messages_read: totalRead,
        total_broadcasts: broadcasts.length,
        delivery_rate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
        read_rate: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0,
        messages_last_7_days: [],
      });
    } catch {
      toast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[#FCA311] animate-spin" /></div>;
  }

  if (!analytics) {
    return <div className="text-center py-12 text-[#666] text-sm">No analytics data available.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold">Analytics</h2>
        <p className="text-sm text-[#888]">WhatsApp messaging performance overview.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contacts', value: analytics.total_contacts, icon: Users, color: '#FCA311' },
          { label: 'Messages Sent', value: analytics.total_messages_sent, icon: MessageCircle, color: '#FCA311' },
          { label: 'Broadcasts', value: analytics.total_broadcasts, icon: Radio, color: '#FCA311' },
          { label: 'Delivery Rate', value: `${analytics.delivery_rate}%`, icon: TrendingUp, color: '#10b981' },
        ].map(card => (
          <div key={card.label} className="hp-glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-xs text-[#888] uppercase tracking-wide">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="hp-glass-card p-5">
          <h3 className="text-sm font-semibold mb-3">Message Funnel</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Sent', value: analytics.total_messages_sent, pct: 100 },
              { label: 'Delivered', value: analytics.total_messages_delivered, pct: analytics.total_messages_sent > 0 ? Math.round((analytics.total_messages_delivered / analytics.total_messages_sent) * 100) : 0 },
              { label: 'Read', value: analytics.total_messages_read, pct: analytics.total_messages_sent > 0 ? Math.round((analytics.total_messages_read / analytics.total_messages_sent) * 100) : 0 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#aaa]">{item.label}</span>
                  <span className="text-white">{item.value} ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FCA311] rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hp-glass-card p-5">
          <h3 className="text-sm font-semibold mb-3">Read Rate</h3>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-[#10b981]">{analytics.read_rate}%</div>
              <p className="text-xs text-[#888] mt-2">of delivered messages were read</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

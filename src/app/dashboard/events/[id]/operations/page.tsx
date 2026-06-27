'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { EventNav } from '@/components/event-nav';
import { ActivityTimeline } from '@/components/activity-timeline';
import { StatusBadge } from '@/components/status-badge';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import {
  Activity, Users, QrCode, ClipboardCheck, Award, CreditCard,
  Coffee, Zap, Bell, Clock, Calendar, AlertTriangle,
  BarChart3, Radio, MapPin, Eye, UserCheck, Smartphone,
  RefreshCw, Shield, Database, MessageCircle,
  DollarSign, TrendingUp, UserPlus, LogOut,
} from 'lucide-react';
import type { OpsCenterData } from '@/app/api/events/[id]/operations/route';

type SectionKey = 'kpis' | 'activity' | 'timeline' | 'health' | 'team' | 'alerts' | 'tasks' | 'summary';

export default function OperationsCenter({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [data, setData] = useState<OpsCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loadedSections, setLoadedSections] = useState<Set<SectionKey>>(new Set());

  const fetchOps = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/operations`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLoadedSections(new Set(['kpis', 'activity', 'timeline', 'health', 'team', 'alerts', 'tasks', 'summary']));
      } else {
        setError(json.error || 'Failed to load operations center');
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchOps(); }, [fetchOps]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOps, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOps]);

  const formatNumber = (n: number) => n.toLocaleString();
  const statusColor = (status: string) => {
    if (['Event Running', 'Check-In Live', 'Registration Open'].includes(status)) return 'success';
    if (['Upcoming'].includes(status)) return 'info';
    if (['Draft', 'Certificate Generation Pending'].includes(status)) return 'warning';
    if (['Cancelled'].includes(status)) return 'error';
    if (['Completed'].includes(status)) return 'default';
    return 'default';
  };

  const healthDot = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-[#10b981]';
      case 'degraded': return 'bg-[var(--hp-primary)]';
      case 'down': return 'bg-[#ef4444]';
      default: return 'bg-[#555]';
    }
  };

  const severityBorder = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-[#ef4444]';
      case 'warning': return 'border-l-[var(--hp-primary)]';
      case 'info': return 'border-l-[#0ea5e9]';
      default: return 'border-l-[#555]';
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={16} className="text-[#ef4444] shrink-0" />;
      case 'warning': return <Bell size={16} className="text-[var(--hp-primary)] shrink-0" />;
      case 'info': return <Activity size={16} className="text-[#0ea5e9] shrink-0" />;
      default: return <Bell size={16} className="text-[#555] shrink-0" />;
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-[#ef4444]';
      case 'medium': return 'text-[var(--hp-primary)]';
      case 'low': return 'text-[#888]';
      default: return 'text-[#888]';
    }
  };

  const SectionCard = ({ title, icon: Icon, children, className = '' }: { title: string; icon: any; children: React.ReactNode; className?: string }) => (
    <div className={`hp-glass-card p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-[var(--hp-primary)]" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <EventNav eventId={eventId} active="operations" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 stagger-children">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-white">Mission Control</h1>
            {data && (
              <StatusBadge status={data.live_status} variant={statusColor(data.live_status)} size="md" />
            )}
          </div>
          <p className="text-sm text-[#888]">Real-time event operations center</p>
        </div>
        {data && (
          <div className="flex items-center gap-2 text-xs text-[#666]">
            <Clock size={12} />
            <span>Timezone: {data.event.timezone || 'UTC'}</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                autoRefresh ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-white/[0.04] text-[#666]'
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? 'animate-hp-spin' : ''} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-sm text-[#ef4444]">
          {error}
          <button onClick={fetchOps} className="ml-3 underline hover:no-underline">Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="hp-glass-card p-4"><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-20" /></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <SkeletonCard lines={8} />
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
            </div>
            <div className="space-y-4">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={4} />
              <SkeletonCard lines={4} />
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6 stagger-children">
            {[
              { label: 'Registered', value: formatNumber(data.kpis.total_registered), icon: Users, color: '#fff' },
              { label: 'Today', value: formatNumber(data.kpis.today_registrations), icon: UserPlus, color: 'var(--hp-primary)' },
              { label: 'Checked In', value: formatNumber(data.kpis.checked_in), icon: QrCode, color: '#10b981' },
              { label: 'Checked Out', value: formatNumber(data.kpis.checked_out), icon: LogOut, color: '#888' },
              { label: 'Inside Now', value: formatNumber(data.kpis.currently_inside), icon: Eye, color: '#0ea5e9' },
              { label: 'Check-in Rate', value: `${data.kpis.check_in_rate}%`, icon: BarChart3, color: '#E5E5E5' },
              { label: 'Certs Generated', value: formatNumber(data.kpis.certificates_generated), icon: Award, color: 'var(--hp-primary)' },
              { label: 'Certs Pending', value: formatNumber(data.kpis.certificates_pending), icon: ClipboardCheck, color: '#f59e0b' },
              { label: 'Payments Received', value: formatNumber(data.kpis.payments_received), icon: DollarSign, color: '#10b981' },
              { label: 'Volunteers Active', value: formatNumber(data.kpis.volunteers_active), icon: UserCheck, color: '#0ea5e9' },
              { label: 'Scanners Online', value: formatNumber(data.kpis.scanners_online), icon: Smartphone, color: '#10b981' },
              { label: 'Food Tokens Used', value: formatNumber(data.kpis.food_tokens_redeemed), icon: Coffee, color: '#f59e0b' },
              { label: 'Sponsor Leads', value: formatNumber(data.kpis.sponsor_leads), icon: TrendingUp, color: '#a78bfa' },
              { label: 'Revenue', value: `₹${formatNumber(data.kpis.total_revenue)}`, icon: CreditCard, color: '#10b981' },
              { label: 'Avg Duration', value: `${Math.floor(data.kpis.avg_duration_minutes / 60)}h ${data.kpis.avg_duration_minutes % 60}m`, icon: Clock, color: '#f59e0b' },
              { label: 'Peak Hour', value: data.kpis.peak_hour, icon: Zap, color: 'var(--hp-primary)' },
            ].map((kpi) => (
              <div key={kpi.label} className="hp-glass-card p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <kpi.icon size={16} style={{ color: kpi.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-tight" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-[11px] text-[#666] truncate">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column — 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              {/* Activity Feed */}
              <SectionCard title="Live Activity Feed" icon={Activity}>
                <div className="max-h-[320px] overflow-y-auto -mx-2 px-2">
                  <ActivityTimeline
                    activities={data.recent_activity}
                    loading={!loadedSections.has('activity')}
                    emptyMessage="No recent activity for this event."
                  />
                </div>
              </SectionCard>

              {/* Event Timeline */}
              <SectionCard title="Event Timeline" icon={Calendar}>
                <div className="space-y-0">
                  {data.timeline.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 relative">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          step.reached ? 'bg-[var(--hp-primary)] border-[var(--hp-primary)]' : 'bg-transparent border-[#444]'
                        }`} />
                        {i < data.timeline.length - 1 && (
                          <div className={`w-px h-full min-h-[20px] ${step.reached ? 'bg-[var(--hp-primary)]/30' : 'bg-white/[0.06]'}`} />
                        )}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${step.reached ? 'text-white' : 'text-[#555]'}`}>{step.label}</p>
                        {step.timestamp && (
                          <p className="text-[11px] text-[#555] mt-0.5">{new Date(step.timestamp).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Smart Alerts */}
              <SectionCard title="Smart Alerts" icon={Bell}>
                {data.alerts.length === 0 ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-[#555]">
                    <Shield size={14} className="text-[#10b981]" />
                    <span>No active alerts. Everything looks good.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.alerts.map(alert => (
                      <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border-l-2 ${severityBorder(alert.severity)}`}>
                        {severityIcon(alert.severity)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">{alert.title}</p>
                          <p className="text-[11px] text-[#888] mt-0.5">{alert.description}</p>
                          {alert.action && (
                            <a href={alert.action.link} className="inline-block mt-1.5 text-[11px] text-[var(--hp-primary)] hover:underline">
                              {alert.action.label} →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Daily Summary */}
              <SectionCard title="Daily Summary" icon={BarChart3}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Registrations Today', value: formatNumber(data.daily_summary.registrations) },
                    { label: 'Revenue Today', value: `₹${formatNumber(data.daily_summary.revenue)}` },
                    { label: 'Recent Check-ins', value: formatNumber(data.daily_summary.attendance) },
                    { label: 'Pending Tasks', value: formatNumber(data.daily_summary.pending_tasks) },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 rounded-lg bg-white/[0.02]">
                      <div className="text-lg font-bold text-white">{item.value}</div>
                      <div className="text-[11px] text-[#666]">{item.label}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Right Column — 1/3 */}
            <div className="space-y-4">
              {/* Health Monitor */}
              <SectionCard title="System Health" icon={Radio}>
                <div className="space-y-2">
                  {data.system_health.map(h => (
                    <div key={h.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${healthDot(h.status)}`} />
                        <span className="text-xs text-[#ccc]">{h.label}</span>
                      </div>
                      <span className={`text-[11px] ${
                        h.status === 'healthy' ? 'text-[#10b981]' : h.status === 'degraded' ? 'text-[var(--hp-primary)]' : 'text-[#ef4444]'
                      }`}>
                        {h.message}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Team Status */}
              <SectionCard title="Team Status" icon={Users}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Online', value: formatNumber(data.team.volunteers_online), icon: UserCheck, color: '#10b981' },
                    { label: 'Scanners', value: formatNumber(data.team.scanners_active), icon: Smartphone, color: '#0ea5e9' },
                    { label: 'Staff', value: formatNumber(data.team.staff_working), icon: Users, color: 'var(--hp-primary)' },
                    { label: 'Invitations', value: formatNumber(data.team.pending_invitations), icon: UserPlus, color: '#f59e0b' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                      <item.icon size={14} style={{ color: item.color }} />
                      <div>
                        <div className="text-sm font-bold text-white">{item.value}</div>
                        <div className="text-[10px] text-[#666]">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.team.recent_activity.length > 0 && (
                  <>
                    <div className="text-[11px] text-[#555] font-medium mb-1.5">Recent Activity</div>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {data.team.recent_activity.slice(0, 4).map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-[#888]">
                          <span className="text-white font-medium">{a.name}</span>
                          <span>{a.action}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>

              {/* Upcoming Tasks */}
              <SectionCard title="Upcoming & Tasks" icon={Calendar}>
                {data.upcoming_tasks.length === 0 ? (
                  <p className="text-xs text-[#555] py-2">No pending tasks.</p>
                ) : (
                  <div className="space-y-2">
                    {data.upcoming_tasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02]">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${priorityColor(task.priority).replace('text-', 'bg-')}`} />
                        <div className="min-w-0">
                          <p className="text-xs text-[#ccc]">{task.title}</p>
                          {task.due && (
                            <p className="text-[10px] text-[#555] mt-0.5">Due: {new Date(task.due).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Live Map Placeholder */}
              <SectionCard title="Venue Map" icon={MapPin}>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <MapPin size={28} className="text-[#444] mb-2" />
                  <p className="text-xs text-[#555]">Live venue mapping coming soon</p>
                  <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                    {['Entry Gates', 'Exit Gates', 'Food Area', 'Reg Desk', 'Help Desk', 'Sponsor Booths', 'Emergency'].map(label => (
                      <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#555]">{label}</span>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hp-glass-card p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap size={15} className="text-[var(--hp-primary)]" />
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Open Scanner', icon: QrCode, link: `/dashboard/events/${eventId}/gates` },
                { label: 'Generate Certs', icon: Award, link: `/dashboard/events/${eventId}/certificates` },
                { label: 'Send Broadcast', icon: MessageCircle, link: `/dashboard/events/${eventId}/crm` },
                { label: 'View Registrations', icon: Users, link: `/dashboard/events/${eventId}/tickets` },
                { label: 'Invite Volunteers', icon: UserPlus, link: `/dashboard/events/${eventId}/volunteers` },
                { label: 'Download Reports', icon: BarChart3, link: `/dashboard/events/${eventId}/analytics` },
                { label: 'Emergency', icon: AlertTriangle, link: `/dashboard/events/${eventId}/emergency` },
              ].map(action => (
                <a
                  key={action.label}
                  href={action.link}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-[#ccc] hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  <action.icon size={14} />
                  {action.label}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Status Bar */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#555] px-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${data.quick_actions.broadcast_status === 'sent' ? 'bg-[#10b981]' : 'bg-[#444]'}`} />
              Broadcast: {data.quick_actions.broadcast_status}
            </span>
            {data.quick_actions.emergency_count > 0 && (
              <span className="flex items-center gap-1.5 text-[var(--hp-primary)]">
                <AlertTriangle size={12} />
                {data.quick_actions.emergency_count} active incident{data.quick_actions.emergency_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

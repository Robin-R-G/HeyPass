import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { attendanceDashboard } from '@/lib/attendance-dashboard';
import { analyticsService } from '@/lib/analytics-service';
import { withAuth } from '@/lib/route-guard';

export interface OpsCenterData {
  event: {
    id: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string;
    timezone: string;
  };
  kpis: {
    total_registered: number;
    today_registrations: number;
    checked_in: number;
    checked_out: number;
    currently_inside: number;
    certificates_generated: number;
    certificates_pending: number;
    payments_received: number;
    payments_pending: number;
    volunteers_active: number;
    scanners_online: number;
    food_tokens_redeemed: number;
    sponsor_leads: number;
    check_in_rate: number;
    avg_duration_minutes: number;
    peak_hour: string;
    total_revenue: number;
  };
  live_status: string;
  timeline: {
    label: string;
    timestamp: string | null;
    reached: boolean;
  }[];
  recent_activity: {
    id: string;
    action: string;
    actor: string;
    target: string;
    target_type: string;
    timestamp: string;
    result: 'success' | 'warning' | 'error';
  }[];
  system_health: {
    id: string;
    label: string;
    status: 'healthy' | 'degraded' | 'down';
    message: string;
  }[];
  team: {
    volunteers_online: number;
    scanners_active: number;
    staff_working: number;
    pending_invitations: number;
    recent_activity: {
      name: string;
      action: string;
      timestamp: string;
    }[];
  };
  alerts: {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    action: { label: string; link: string } | null;
  }[];
  daily_summary: {
    registrations: number;
    revenue: number;
    attendance: number;
    messages_sent: number;
    certificates_generated: number;
    pending_tasks: number;
  };
  upcoming_tasks: {
    id: string;
    title: string;
    due: string;
    type: 'deadline' | 'action';
    priority: 'high' | 'medium' | 'low';
  }[];
  quick_actions: {
    broadcast_status: string;
    whatsapp_queue: number;
    support_requests: number;
    emergency_count: number;
  };
}

async function getOpsData(clientId: string, eventId: string): Promise<OpsCenterData> {
  const [eventResult, dashboardResult, overviewResult, realtimeResult] = await Promise.all([
    supabaseAdmin.from('events').select('id, title, status, start_date, end_date, timezone').eq('id', eventId).single(),
    attendanceDashboard.getFullDashboard(clientId, eventId).catch(() => null),
    analyticsService.getOverview(clientId, eventId).catch(() => null),
    analyticsService.getRealtime(clientId, eventId).catch(() => null),
  ]);

  const event = eventResult.data || { id: eventId, title: 'Event', status: 'draft', start_date: '', end_date: '', timezone: '' };

  const dashboard = dashboardResult || {
    total_registered: 0, total_checked_in: 0, total_checked_out: 0, currently_inside: 0,
    check_in_rate: 0, avg_duration_minutes: 0, peak_hour: '00:00',
    gate_breakdown: [], hourly_distribution: [], session_breakdown: [],
  };

  const overview = overviewResult || {
    total_registered: 0, total_checked_in: 0, total_checked_out: 0, attendance_rate: 0,
    no_show_rate: 0, total_revenue: 0, revenue_trend: 0, total_certificates: 0,
    certificates_downloaded: 0, active_volunteers: 0, active_gates: 0,
  };

  const realtime = realtimeResult || {
    check_ins_last_5min: 0, check_ins_last_30min: 0, active_scanners: 0,
    gates_open: 0, gates_total: 0, registrations_last_hour: 0, certificates_generated_last_hour: 0,
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    todayRegsResult,
    certsResult,
    paymentsResult,
    foodTokensResult,
    sponsorsResult,
    teamResult,
    invitationsResult,
    scansResult,
    emergencyResult,
    whatsappResult,
    recentActivityResult,
  ] = await Promise.all([
    supabaseAdmin.from('registrations').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('event_id', eventId).gte('created_at', todayStart.toISOString()),
    supabaseAdmin.from('certificates').select('id, status').eq('client_id', clientId).eq('event_id', eventId).is('deleted_at', null),
    supabaseAdmin.from('payments').select('id, amount, status').eq('client_id', clientId).eq('event_id', eventId),
    supabaseAdmin.from('food_tokens').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('event_id', eventId).eq('status', 'used'),
    supabaseAdmin.from('sponsors').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('event_id', eventId).eq('is_active', true),
    supabaseAdmin.from('gate_staff').select('id, status').eq('client_id', clientId).eq('event_id', eventId),
    supabaseAdmin.from('client_memberships').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('status', 'invited'),
    supabaseAdmin.from('check_in_stations').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('event_id', eventId).gte('last_ping_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    supabaseAdmin.from('emergency_incidents').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).eq('event_id', eventId).not('status', 'eq', 'closed'),
    supabaseAdmin.from('whatsapp_broadcasts').select('id, status').eq('client_id', clientId).eq('event_id', eventId).order('created_at', { ascending: false }).limit(1),
    supabaseAdmin.from('audit_logs').select('id, action, resource_type, resource_id, created_at, user_id, new_value')
      .eq('client_id', clientId).eq('event_id', eventId)
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const certData = (certsResult.data || []) as { id: string; status: string }[];
  const certsGenerated = certData.length;
  const certsPending = certData.filter(c => c.status === 'generated' || c.status === 'delivered').length;

  const paymentData = (paymentsResult.data || []) as { id: string; amount: number; status: string }[];
  const paymentsReceived = paymentData.filter(p => p.status === 'completed').length;
  const paymentsPending = paymentData.filter(p => p.status === 'pending').length;

  const gateStaffData = (teamResult.data || []) as { id: string; status: string }[];
  const volunteersActive = gateStaffData.filter(s => s.status === 'on_duty').length;
  const staffWorking = gateStaffData.filter(s => s.status === 'on_duty' || s.status === 'active').length;

  const whatsappData = (whatsappResult.data || []) as { id: string; status: string }[];
  const broadcastStatus = whatsappData.length > 0 ? whatsappData[0].status : 'idle';

  const alerts = await computeAlerts(clientId, eventId, dashboard, realtime, certData, paymentData, gateStaffData);

  const activities = recentActivityToEvents(recentActivityResult.data || [], event.title);

  const computedStatus = computeLiveStatus(event, dashboard);

  const computedTimeline = computeEventTimeline(event, dashboard);

  const computedTasks = computeUpcomingTasks(event, certsPending, broadcastStatus);

  return {
    event: {
      id: event.id, title: event.title, status: event.status,
      start_date: event.start_date, end_date: event.end_date, timezone: event.timezone,
    },
    kpis: {
      total_registered: dashboard.total_registered,
      today_registrations: todayRegsResult.count || 0,
      checked_in: dashboard.total_checked_in,
      checked_out: dashboard.total_checked_out,
      currently_inside: dashboard.currently_inside,
      certificates_generated: certsGenerated,
      certificates_pending: certsPending,
      payments_received: paymentsReceived,
      payments_pending: paymentsPending,
      volunteers_active: volunteersActive,
      scanners_online: realtime.active_scanners,
      food_tokens_redeemed: foodTokensResult.count || 0,
      sponsor_leads: sponsorsResult.count || 0,
      check_in_rate: dashboard.check_in_rate,
      avg_duration_minutes: dashboard.avg_duration_minutes,
      peak_hour: dashboard.peak_hour,
      total_revenue: overview.total_revenue,
    },
    live_status: computedStatus,
    timeline: computedTimeline,
    recent_activity: activities.slice(0, 15),
    system_health: await computeSystemHealth(clientId, eventId),
    team: {
      volunteers_online: volunteersActive,
      scanners_active: realtime.active_scanners,
      staff_working: staffWorking,
      pending_invitations: invitationsResult.count || 0,
      recent_activity: await getTeamActivity(clientId, eventId),
    },
    alerts,
    daily_summary: {
      registrations: todayRegsResult.count || 0,
      revenue: paymentData.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0),
      attendance: realtime.check_ins_last_30min,
      messages_sent: 0,
      certificates_generated: certsGenerated,
      pending_tasks: certsPending + paymentsPending + (emergencyResult.count || 0),
    },
    upcoming_tasks: computedTasks,
    quick_actions: {
      broadcast_status: broadcastStatus,
      whatsapp_queue: 0,
      support_requests: 0,
      emergency_count: emergencyResult.count || 0,
    },
  };
}

function computeLiveStatus(event: { status: string; start_date: string; end_date: string }, dashboard: { total_checked_in: number; total_registered: number }): string {
  const now = new Date();
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);

  if (event.status === 'draft') return 'Draft';
  if (event.status === 'cancelled') return 'Cancelled';
  if (event.status === 'completed') return 'Completed';

  if (now < start) {
    return 'Upcoming';
  }

  if (dashboard.total_checked_in > 0 && dashboard.total_registered > 0 && now >= start && now <= end) {
    return 'Event Running';
  }

  if (dashboard.total_checked_in > 0 && now >= start) {
    return 'Check-In Live';
  }

  if (now >= start && now <= end) {
    return 'Registration Open';
  }

  if (now > end) {
    return 'Certificate Generation Pending';
  }

  return event.status;
}

function computeEventTimeline(event: { status: string; start_date: string; end_date: string; created_at?: string }, dashboard: { total_checked_in: number; total_registered: number; total_checked_out: number }): { label: string; timestamp: string | null; reached: boolean }[] {
  const steps = [
    { label: 'Event Created', reached: true, timestamp: event.created_at || event.start_date },
    { label: 'Registration Open', reached: dashboard.total_registered > 0, timestamp: null },
    { label: 'Registrations Closed', reached: false, timestamp: null },
    { label: 'Check-In Started', reached: dashboard.total_checked_in > 0, timestamp: null },
    { label: 'Event Running', reached: dashboard.total_checked_in > 0, timestamp: null },
    { label: 'Certificates Generated', reached: false, timestamp: null },
    { label: 'Event Completed', reached: event.status === 'completed', timestamp: null },
  ];

  if (new Date(event.start_date) <= new Date()) {
    steps[2] = { label: 'Registrations Closed', reached: true, timestamp: event.start_date };
  }

  return steps;
}

async function computeAlerts(
  clientId: string, eventId: string,
  dashboard: { total_checked_in: number; total_registered: number; check_in_rate: number },
  realtime: { check_ins_last_5min: number; check_ins_last_30min: number; registrations_last_hour: number },
  certData: { id: string; status: string }[],
  paymentData: { id: string; status: string }[],
  gateStaffData: { id: string; status: string }[],
): Promise<OpsCenterData['alerts']> {
  const alerts: OpsCenterData['alerts'] = [];

  if (dashboard.total_checked_in > 0 && realtime.check_ins_last_5min === 0) {
    alerts.push({
      id: 'no-checkins',
      severity: 'warning',
      title: 'Check-ins have paused',
      description: 'No check-ins detected in the last 5 minutes. Verify scanner connectivity.',
      action: { label: 'View Gates', link: `/dashboard/events/${eventId}/gates` },
    });
  }

  if (realtime.registrations_last_hour > 50) {
    alerts.push({
      id: 'reg-spike',
      severity: 'info',
      title: 'Registration spike detected',
      description: `${realtime.registrations_last_hour} registrations in the last hour.`,
      action: null,
    });
  }

  const failedCerts = certData.filter(c => c.status === 'revoked').length;
  if (failedCerts > 5) {
    alerts.push({
      id: 'certs-failing',
      severity: 'warning',
      title: 'Certificate revocations elevated',
      description: `${failedCerts} certificates have been revoked. Review if this is expected.`,
      action: { label: 'View Certificates', link: `/dashboard/events/${eventId}/certificates` },
    });
  }

  const fraudCount = 0;
  if (fraudCount > 0) {
    alerts.push({
      id: 'fraud-warning',
      severity: 'critical',
      title: 'Fraud suspected',
      description: `${fraudCount} potential fraud cases detected at gates.`,
      action: { label: 'Review Fraud', link: `/dashboard/events/${eventId}/fraud` },
    });
  }

  const offlineScanners = gateStaffData.filter(s => s.status !== 'on_duty').length;
  if (offlineScanners > 2) {
    alerts.push({
      id: 'scanners-offline',
      severity: 'warning',
      title: `${offlineScanners} scanners offline`,
      description: 'Some scanning stations have not reported recently.',
      action: { label: 'View Staff', link: `/dashboard/events/${eventId}/staff` },
    });
  }

  return alerts;
}

async function computeSystemHealth(clientId: string, eventId: string): Promise<OpsCenterData['system_health']> {
  const health: OpsCenterData['system_health'] = [
    { id: 'db', label: 'Database', status: 'healthy', message: 'Connected' },
    { id: 'auth', label: 'Authentication', status: 'healthy', message: 'Operational' },
    { id: 'scanner', label: 'Scanner Sync', status: 'healthy', message: 'Synchronized' },
  ];

  try {
    const { error: dbCheck } = await supabaseAdmin.from('events').select('id').eq('id', eventId).limit(1);
    if (dbCheck) {
      health[0] = { id: 'db', label: 'Database', status: 'degraded', message: 'Slow response' };
    }
  } catch {
    health[0] = { id: 'db', label: 'Database', status: 'down', message: 'Unreachable' };
  }

  try {
    const waResult = await supabaseAdmin.from('whatsapp_credentials').select('id').eq('client_id', clientId).limit(1);
    const hasWhatsApp = (waResult.data || []).length > 0;
    health.push({
      id: 'whatsapp', label: 'WhatsApp',
      status: hasWhatsApp ? 'healthy' : 'degraded',
      message: hasWhatsApp ? 'Connected' : 'Not configured',
    });
  } catch {
    health.push({ id: 'whatsapp', label: 'WhatsApp', status: 'down', message: 'Disconnected' });
  }

  try {
    const pmResult = await supabaseAdmin.from('payment_methods').select('id').eq('client_id', clientId).limit(1);
    const hasPayments = (pmResult.data || []).length > 0;
    health.push({
      id: 'payments', label: 'Payments',
      status: hasPayments ? 'healthy' : 'degraded',
      message: hasPayments ? 'Configured' : 'Not configured',
    });
  } catch {
    health.push({ id: 'payments', label: 'Payments', status: 'down', message: 'Unreachable' });
  }

  try {
    const certTemplates = await supabaseAdmin.from('certificate_templates').select('id').eq('client_id', clientId).limit(1);
    const hasTemplates = (certTemplates.data || []).length > 0;
    health.push({
      id: 'certs', label: 'Certificate Engine',
      status: hasTemplates ? 'healthy' : 'degraded',
      message: hasTemplates ? 'Ready' : 'No templates',
    });
  } catch {
    health.push({ id: 'certs', label: 'Certificate Engine', status: 'down', message: 'Error' });
  }

  const storageConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  health.push({
    id: 'storage', label: 'Storage',
    status: storageConfigured ? 'healthy' : 'degraded',
    message: storageConfigured ? 'Available' : 'Not configured',
  });

  const emailConfigured = !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST;
  health.push({
    id: 'email', label: 'Email',
    status: emailConfigured ? 'healthy' : 'degraded',
    message: emailConfigured ? 'Ready' : 'Not configured',
  });

  health.push({
    id: 'queue', label: 'Queue Processor',
    status: 'healthy', message: 'Running',
  });

  return health;
}

async function getTeamActivity(clientId: string, eventId: string): Promise<{ name: string; action: string; timestamp: string }[]> {
  try {
    const { data } = await supabaseAdmin
      .from('gate_staff')
      .select('id, status, started_at, users!inner(first_name, last_name)')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .order('started_at', { ascending: false })
      .limit(10);

    return ((data || []) as any[]).map((s: any) => ({
      name: s.users ? `${s.users.first_name || ''} ${s.users.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
      action: s.status === 'on_duty' ? 'came online' : 'went offline',
      timestamp: s.started_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function recentActivityToEvents(data: any[], eventTitle: string): OpsCenterData['recent_activity'] {
  return (data || []).map((log: any) => ({
    id: log.id,
    action: log.action || 'updated',
    actor: log.user_id?.slice(0, 8) || 'System',
    target: log.resource_type || eventTitle,
    target_type: log.resource_type || 'event',
    timestamp: log.created_at,
    result: 'success' as const,
  }));
}

function computeUpcomingTasks(event: { status: string; start_date: string; end_date: string; title: string }, certsPending: number, broadcastStatus: string): OpsCenterData['upcoming_tasks'] {
  const tasks: OpsCenterData['upcoming_tasks'] = [];
  const now = new Date();
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);

  if (event.status === 'draft') {
    tasks.push({ id: 'publish-event', title: 'Publish event to open registration', due: event.start_date, type: 'action', priority: 'high' });
  }

  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs > 0 && diffDays <= 7) {
    tasks.push({
      id: 'event-starting', title: `Event starts ${diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`}`,
      due: event.start_date, type: 'deadline', priority: diffDays <= 1 ? 'high' : 'medium',
    });
  }

  if (certsPending > 0 && now > end) {
    tasks.push({
      id: 'certs-pending', title: `${certsPending} certificate${certsPending === 1 ? '' : 's'} pending generation`,
      due: '', type: 'action', priority: 'high',
    });
  }

  if (broadcastStatus === 'draft' || broadcastStatus === 'scheduled') {
    tasks.push({
      id: 'broadcast-pending', title: 'WhatsApp broadcast pending review',
      due: '', type: 'action', priority: 'medium',
    });
  }

  if (now >= start && now <= end && diffDays < -1) {
    tasks.push({
      id: 'event-ongoing', title: 'Event is live — monitor operations',
      due: event.end_date, type: 'deadline', priority: 'medium',
    });
  }

  return tasks;
}

// GET /api/events/[id]/operations
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id: eventId } = await params;
      const data = await getOpsData(clientId, eventId);
      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load operations center';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

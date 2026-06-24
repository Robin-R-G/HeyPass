'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface DashboardData {
  total_registered: number;
  total_checked_in: number;
  total_checked_out: number;
  attendance_rate: number;
  no_show_rate: number;
  total_revenue: number;
  revenue_trend: number;
  total_certificates: number;
  certificates_downloaded: number;
  active_volunteers: number;
  active_gates: number;
}

interface AttendanceData {
  timeline: { date: string; check_ins: number; check_outs: number }[];
  by_gate: { gate_name: string; type: string; check_ins: number; check_outs: number }[];
  by_hour: { hour: number; count: number }[];
  peak_hours: { hour: number; avg_count: number }[];
  no_shows: { total: number; rate: number };
}

interface RevenueData {
  timeline: { date: string; revenue: number }[];
  by_payment_method: { method: string; count: number; amount: number }[];
  total: number;
  refunds: { count: number; amount: number };
}

interface CertificateData {
  timeline: { date: string; generated: number; downloaded: number; revoked: number }[];
  by_type: { type: string; count: number }[];
  download_rate: { total: number; downloaded: number; rate: number };
  revocation_rate: { total: number; revoked: number; rate: number };
}

interface VolunteerData {
  top_performers: {
    volunteer_id: string;
    name: string;
    hours: number;
    tasks_completed: number;
    shifts_attended: number;
  }[];
}

interface RealtimeData {
  check_ins_last_5min: number;
  check_ins_last_30min: number;
  active_scanners: number;
  gates_open: number;
  gates_total: number;
  registrations_last_hour: number;
  certificates_generated_last_hour: number;
}

function MiniChart({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const width = 80;
  const height = 30;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

function BarChart({ data, labelKey, valueKey, color = '#3b82f6' }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  if (data.length === 0) return <div className="text-sm text-muted-foreground">No data</div>;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs w-24 truncate">{String(d[labelKey])}</span>
          <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(Number(d[valueKey]) / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-xs font-mono w-16 text-right">{Number(d[valueKey]).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [overview, setOverview] = useState<DashboardData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [certificates, setCertificates] = useState<CertificateData | null>(null);
  const [volunteers, setVolunteers] = useState<VolunteerData | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [days, setDays] = useState('30');

  useEffect(() => {
    fetchOverview();
  }, [eventId]);

  useEffect(() => {
    if (activeTab !== 'overview' && activeTab !== 'realtime') {
      fetchSection(activeTab);
    }
  }, [activeTab, days]);

  useEffect(() => {
    if (activeTab === 'realtime') {
      const eventSource = new EventSource(`/api/events/${eventId}/analytics/live`);
      eventSource.onmessage = (event) => {
        try {
          setRealtime(JSON.parse(event.data));
        } catch {}
      };
      return () => eventSource.close();
    }
  }, [activeTab, eventId]);

  async function fetchOverview() {
    try {
      const res = await fetch(`/api/events/${eventId}/analytics?section=overview`);
      const data = await res.json();
      setOverview(data.data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSection(section: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/analytics?section=${section}&days=${days}`);
      const data = await res.json();

      switch (section) {
        case 'attendance': setAttendance(data.data); break;
        case 'revenue': setRevenue(data.data); break;
        case 'certificates': setCertificates(data.data); break;
        case 'volunteers': setVolunteers(data.data); break;
      }
    } catch (err) {
      console.error(`Failed to fetch ${section}:`, err);
    }
  }

  async function exportReport(type: string, format: string) {
    window.open(`/api/events/${eventId}/reports/${type}?format=${format}`, '_blank');
  }

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Analytics</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportReport('full', 'csv')}>
            Export All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="realtime">Live</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overview && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{overview.total_registered.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Registered</div>
                    <MiniChart data={[overview.total_registered, overview.total_checked_in]} color="#3b82f6" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{overview.total_checked_in.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Checked In</div>
                    <MiniChart data={[overview.total_checked_in]} color="#22c55e" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{overview.attendance_rate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Attendance Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">₹{overview.total_revenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Revenue</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{overview.total_certificates}</div>
                    <div className="text-sm text-muted-foreground">Certificates</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{overview.active_volunteers}</div>
                    <div className="text-sm text-muted-foreground">Active Volunteers</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">No-Show Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{overview.no_show_rate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">
                      {overview.total_registered - overview.total_checked_in} people
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Certificate Downloads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-[#FCA311]">
                      {overview.total_certificates > 0
                        ? ((overview.certificates_downloaded / overview.total_certificates) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {overview.certificates_downloaded} / {overview.total_certificates}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => exportReport('attendance', 'csv')}>Attendance CSV</Button>
                <Button variant="outline" size="sm" onClick={() => exportReport('revenue', 'csv')}>Revenue CSV</Button>
                <Button variant="outline" size="sm" onClick={() => exportReport('volunteers', 'csv')}>Volunteers CSV</Button>
                <Button variant="outline" size="sm" onClick={() => exportReport('certificates', 'csv')}>Certificates CSV</Button>
                <Button variant="outline" size="sm" onClick={() => exportReport('gates', 'csv')}>Gates CSV</Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {attendance && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Check-ins by Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={attendance.by_hour.map(h => ({ hour: `${h.hour}:00`, count: h.count }))}
                      labelKey="hour"
                      valueKey="count"
                      color="#3b82f6"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Check-ins by Gate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={attendance.by_gate}
                      labelKey="gate_name"
                      valueKey="check_ins"
                      color="#22c55e"
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Attendance Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance.timeline.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Date</th>
                            <th className="text-right p-2">Check-ins</th>
                            <th className="text-right p-2">Check-outs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.timeline.slice(-14).map((row, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{row.date}</td>
                              <td className="text-right p-2 font-mono">{row.check_ins}</td>
                              <td className="text-right p-2 font-mono">{row.check_outs}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{attendance.no_shows.total}</div>
                      <div className="text-sm text-muted-foreground">No-Shows ({attendance.no_shows.rate.toFixed(1)}%)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {revenue && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">₹{revenue.total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">₹{revenue.refunds.amount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Refunds ({revenue.refunds.count})</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{(revenue.total - revenue.refunds.amount).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Net Revenue</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Revenue Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenue.timeline.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No data</div>
                    ) : (
                      <div className="space-y-1">
                        {revenue.timeline.slice(-10).map((row, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-20">{row.date}</span>
                            <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(row.revenue / Math.max(...revenue.timeline.map(t => t.revenue), 1)) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono w-20 text-right">₹{row.revenue.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Revenue by Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={revenue.by_payment_method}
                      labelKey="method"
                      valueKey="amount"
                      color="#FCA311"
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Volunteers Tab */}
        <TabsContent value="volunteers" className="space-y-6">
          {volunteers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Volunteers</CardTitle>
              </CardHeader>
              <CardContent>
                {volunteers.top_performers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No volunteer data</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-right p-2">Hours</th>
                          <th className="text-right p-2">Tasks</th>
                          <th className="text-right p-2">Shifts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volunteers.top_performers.map((v, i) => (
                          <tr key={v.volunteer_id} className="border-b">
                            <td className="p-2">{i + 1}</td>
                            <td className="p-2 font-medium">{v.name}</td>
                            <td className="text-right p-2 font-mono">{v.hours.toFixed(1)}</td>
                            <td className="text-right p-2 font-mono">{v.tasks_completed}</td>
                            <td className="text-right p-2 font-mono">{v.shifts_attended}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-6">
          {certificates && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{certificates.download_rate.total}</div>
                    <div className="text-sm text-muted-foreground">Total Issued</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{certificates.download_rate.downloaded}</div>
                    <div className="text-sm text-muted-foreground">Downloaded</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-[#FCA311]">{certificates.download_rate.rate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Download Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{certificates.revocation_rate.revoked}</div>
                    <div className="text-sm text-muted-foreground">Revoked</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">By Certificate Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={certificates.by_type}
                      labelKey="type"
                      valueKey="count"
                      color="#f59e0b"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Generation Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {certificates.timeline.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No data</div>
                    ) : (
                      <div className="space-y-1">
                        {certificates.timeline.slice(-10).map((row, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-20">{row.date}</span>
                            <Badge variant="outline" className="text-xs">+{row.generated}</Badge>
                            <Badge variant="secondary" className="text-xs">{row.downloaded} dl</Badge>
                            {row.revoked > 0 && (
                              <Badge variant="destructive" className="text-xs">{row.revoked} revoked</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Realtime Tab */}
        <TabsContent value="realtime" className="space-y-6">
          {realtime && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-green-600 animate-pulse">
                    {realtime.check_ins_last_5min}
                  </div>
                  <div className="text-sm text-muted-foreground">Check-ins (5 min)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-[#FCA311]">{realtime.check_ins_last_30min}</div>
                  <div className="text-sm text-muted-foreground">Check-ins (30 min)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-purple-600">{realtime.active_scanners}</div>
                  <div className="text-sm text-muted-foreground">Active Scanners</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold">{realtime.gates_open}/{realtime.gates_total}</div>
                  <div className="text-sm text-muted-foreground">Gates Open</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-orange-600">{realtime.registrations_last_hour}</div>
                  <div className="text-sm text-muted-foreground">Registrations (1 hr)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-yellow-600">{realtime.certificates_generated_last_hour}</div>
                  <div className="text-sm text-muted-foreground">Certs Generated (1 hr)</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

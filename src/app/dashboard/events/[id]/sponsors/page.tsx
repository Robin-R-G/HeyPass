'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logo_url: string | null;
  website_url: string | null;
  booth_location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  amount_paid: number;
  is_active: boolean;
  created_at: string;
}

interface Branding {
  id: string;
  sponsor_id: string;
  placement_type: string;
  impressions: number;
  unique_views: number;
  clicks: number;
  scans: number;
  last_scanned_at: string | null;
  sponsor: { name: string; tier: string } | null;
}

interface Analytics {
  total_impressions: number;
  total_unique_views: number;
  total_scans: number;
  total_clicks: number;
  top_performers: {
    branding_id: string;
    placement_type: string;
    impressions: number;
    scans: number;
    clicks: number;
  }[];
  scan_timeline: { date: string; count: number }[];
}

interface Scan {
  id: string;
  scan_type: string;
  device_info: string | null;
  scanned_at: string;
  sponsor: { name: string; tier: string } | null;
  branding: { placement_type: string } | null;
  registration: { first_name: string; last_name: string; email: string } | null;
}

const TIER_COLORS: Record<string, string> = {
  platinum: 'bg-violet-100 text-violet-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-gray-100 text-gray-800',
  bronze: 'bg-orange-100 text-orange-800',
  custom: 'bg-blue-100 text-blue-800',
};

const PLACEMENT_LABELS: Record<string, string> = {
  banner: 'Banner',
  stage_digital: 'Stage Digital',
  hall_screen: 'Hall Screen',
  badge: 'Badge',
  certificate: 'Certificate',
  webpage: 'Webpage',
};

export default function SponsorsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [branding, setBranding] = useState<Branding[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sponsors');

  const [showAddSponsor, setShowAddSponsor] = useState(false);
  const [showAddBranding, setShowAddBranding] = useState(false);
  const [newSponsor, setNewSponsor] = useState({ name: '', tier: 'silver', contact_name: '', contact_email: '', amount_paid: '' });
  const [newBranding, setNewBranding] = useState({ placement_type: 'banner' });

  useEffect(() => {
    fetchAll();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'branding') fetchBranding();
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'scans') fetchScans();
  }, [activeTab]);

  async function fetchAll() {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors`);
      const data = await res.json();
      setSponsors(data.data?.sponsors || []);
    } catch (err) {
      console.error('Failed to fetch sponsors:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBranding() {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors/all/branding`);
      const data = await res.json();
      setBranding(data.data?.branding || []);
    } catch (err) {
      console.error('Failed to fetch branding:', err);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors/all/analytics`);
      const data = await res.json();
      setAnalytics(data.data?.analytics || null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }

  async function fetchScans() {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors/all/scan`);
      const data = await res.json();
      setScans(data.data?.scans || []);
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    }
  }

  async function handleAddSponsor() {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSponsor,
          amount_paid: newSponsor.amount_paid ? parseFloat(newSponsor.amount_paid) : 0,
        }),
      });
      if (res.ok) {
        setShowAddSponsor(false);
        setNewSponsor({ name: '', tier: 'silver', contact_name: '', contact_email: '', amount_paid: '' });
        fetchAll();
      }
    } catch (err) {
      console.error('Failed to add sponsor:', err);
    }
  }

  async function handleAddBranding(sponsorId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors/${sponsorId}/branding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranding),
      });
      if (res.ok) {
        setShowAddBranding(false);
        setNewBranding({ placement_type: 'banner' });
        fetchBranding();
      }
    } catch (err) {
      console.error('Failed to add branding:', err);
    }
  }

  async function handleDeleteSponsor(sponsorId: string) {
    if (!confirm('Delete this sponsor?')) return;
    try {
      await fetch(`/api/events/${eventId}/sponsors/${sponsorId}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {
      console.error('Failed to delete sponsor:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading sponsors...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sponsor Analytics</h1>
        <Button onClick={() => setShowAddSponsor(true)}>Add Sponsor</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="scans">Scan Activity</TabsTrigger>
        </TabsList>

        {/* Sponsors Tab */}
        <TabsContent value="sponsors" className="space-y-4">
          {sponsors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sponsors yet. Add your first sponsor to get started.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Tier</th>
                      <th className="text-left p-3">Contact</th>
                      <th className="text-right p-3">Amount Paid</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsors.map((s) => (
                      <tr key={s.id} className="border-b">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3">
                          <Badge className={TIER_COLORS[s.tier] || ''}>{s.tier}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{s.contact_email || '-'}</td>
                        <td className="p-3 text-right font-mono">₹{Number(s.amount_paid).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSponsor(s.id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddBranding(true)}>Add Placement</Button>
          </div>
          {branding.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No branding placements yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {branding.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{PLACEMENT_LABELS[b.placement_type] || b.placement_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {b.sponsor?.name} ({b.sponsor?.tier})
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-mono font-bold">{(b.impressions || 0).toLocaleString()}</div>
                          <div className="text-muted-foreground text-xs">Impressions</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono font-bold">{(b.unique_views || 0).toLocaleString()}</div>
                          <div className="text-muted-foreground text-xs">Unique Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono font-bold">{(b.scans || 0).toLocaleString()}</div>
                          <div className="text-muted-foreground text-xs">Scans</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono font-bold">{(b.clicks || 0).toLocaleString()}</div>
                          <div className="text-muted-foreground text-xs">Clicks</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{analytics.total_impressions.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Impressions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{analytics.total_unique_views.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Unique Views</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{analytics.total_scans.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Scans</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{analytics.total_clicks.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Clicks</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Top Performing Placements</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.top_performers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="space-y-2">
                      {analytics.top_performers.map((p) => {
                        const max = Math.max(...analytics.top_performers.map(t => t.impressions), 1);
                        return (
                          <div key={p.branding_id} className="flex items-center gap-2">
                            <span className="text-xs w-28 truncate">{PLACEMENT_LABELS[p.placement_type] || p.placement_type}</span>
                            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${(p.impressions / max) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-16 text-right">{p.impressions.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {analytics.scan_timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Scan Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {analytics.scan_timeline.slice(-14).map((row) => {
                        const max = Math.max(...analytics.scan_timeline.map(t => t.count), 1);
                        return (
                          <div key={row.date} className="flex items-center gap-2 text-sm">
                            <span className="w-20">{row.date}</span>
                            <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(row.count / max) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono w-12 text-right">{row.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Scan Activity Tab */}
        <TabsContent value="scans" className="space-y-4">
          {scans.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No scans recorded yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">Sponsor</th>
                      <th className="text-left p-3">Placement</th>
                      <th className="text-left p-3">Scan Type</th>
                      <th className="text-left p-3">Attendee</th>
                      <th className="text-left p-3">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((s) => (
                      <tr key={s.id} className="border-b">
                        <td className="p-3 font-mono text-xs">
                          {new Date(s.scanned_at).toLocaleString()}
                        </td>
                        <td className="p-3">{s.sponsor?.name || '-'}</td>
                        <td className="p-3">{PLACEMENT_LABELS[s.branding?.placement_type || ''] || '-'}</td>
                        <td className="p-3">
                          <Badge variant="outline">{s.scan_type}</Badge>
                        </td>
                        <td className="p-3">
                          {s.registration
                            ? `${s.registration.first_name} ${s.registration.last_name}`
                            : '-'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-32 truncate">
                          {s.device_info || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Sponsor Dialog */}
      <Dialog open={showAddSponsor} onOpenChange={setShowAddSponsor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sponsor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sponsor Name *</Label>
              <Input
                value={newSponsor.name}
                onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label>Tier</Label>
              <Select
                value={newSponsor.tier}
                onValueChange={(v) => setNewSponsor({ ...newSponsor, tier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={newSponsor.contact_name}
                  onChange={(e) => setNewSponsor({ ...newSponsor, contact_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  value={newSponsor.contact_email}
                  onChange={(e) => setNewSponsor({ ...newSponsor, contact_email: e.target.value })}
                  placeholder="john@acme.com"
                />
              </div>
            </div>
            <div>
              <Label>Amount Paid (₹)</Label>
              <Input
                type="number"
                value={newSponsor.amount_paid}
                onChange={(e) => setNewSponsor({ ...newSponsor, amount_paid: e.target.value })}
                placeholder="50000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSponsor(false)}>Cancel</Button>
            <Button onClick={handleAddSponsor} disabled={!newSponsor.name}>Add Sponsor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Branding Dialog */}
      <Dialog open={showAddBranding} onOpenChange={setShowAddBranding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Branding Placement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sponsor</Label>
              <Select onValueChange={(v) => setNewBranding({ ...newBranding, placement_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sponsor" />
                </SelectTrigger>
                <SelectContent>
                  {sponsors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Placement Type</Label>
              <Select
                value={newBranding.placement_type}
                onValueChange={(v) => setNewBranding({ ...newBranding, placement_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="stage_digital">Stage Digital</SelectItem>
                  <SelectItem value="hall_screen">Hall Screen</SelectItem>
                  <SelectItem value="badge">Badge</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="webpage">Webpage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBranding(false)}>Cancel</Button>
            <Button onClick={() => handleAddBranding(sponsors[0]?.id)}>Add Placement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

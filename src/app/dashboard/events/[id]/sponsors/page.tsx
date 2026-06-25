"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Sponsor { id: string; name: string; tier: string; website_url: string; booth_location: string; amount_paid: number; is_active: boolean; }
interface Branding { id: string; sponsor_id: string; placement_type: string; impressions: number; unique_views: number; clicks: number; scans: number; }
interface Analytics { total_impressions: number; total_unique_views: number; total_scans: number; total_clicks: number; }

export default function SponsorsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [branding, setBranding] = useState<Branding[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSponsor, setNewSponsor] = useState({ name: "", tier: "silver", website_url: "", booth_location: "", amount_paid: 0, contact_name: "", contact_email: "" });

  useEffect(() => {
    fetch(`/api/events/${eventId}/sponsors`).then(r => r.json()).then(data => {
      setSponsors(data.sponsors || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [eventId]);

  const createSponsor = async () => {
    await fetch(`/api/events/${eventId}/sponsors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSponsor) });
    setCreateOpen(false);
    const data = await fetch(`/api/events/${eventId}/sponsors`).then(r => r.json());
    setSponsors(data.sponsors || []);
  };

  const tierColor = (t: string) => {
    switch (t) { case "platinum": return "bg-[rgba(229,229,229,0.08)] text-white"; case "gold": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; case "silver": return "bg-[rgba(148,163,184,0.15)] text-white"; case "bronze": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; default: return "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]"; }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="p-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Sponsors</span>
      </nav>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sponsor Management</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${eventId}/dashboard`}><Button variant="outline" size="sm">Event</Button></Link>
          <Link href={`/dashboard/events/${eventId}/crm`}><Button variant="outline" size="sm">CRM Portal</Button></Link>
          <Link href={`/dashboard/events/${eventId}/sponsors`}><Button size="sm">Sponsors</Button></Link>
        </div>
      </div>
      <Tabs defaultValue="sponsors">
        <TabsList>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="scans">Scan Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="sponsors" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sponsors ({sponsors.length})</CardTitle>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild><Button>Add Sponsor</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Sponsor</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Name</Label><Input value={newSponsor.name} onChange={e => setNewSponsor({ ...newSponsor, name: e.target.value })} /></div>
                    <div><Label>Tier</Label>
                      <Select value={newSponsor.tier} onValueChange={v => setNewSponsor({ ...newSponsor, tier: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="platinum">Platinum</SelectItem><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="bronze">Bronze</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Website</Label><Input value={newSponsor.website_url} onChange={e => setNewSponsor({ ...newSponsor, website_url: e.target.value })} /></div>
                    <div><Label>Booth Location</Label><Input value={newSponsor.booth_location} onChange={e => setNewSponsor({ ...newSponsor, booth_location: e.target.value })} /></div>
                    <div><Label>Amount Paid</Label><Input type="number" value={newSponsor.amount_paid} onChange={e => setNewSponsor({ ...newSponsor, amount_paid: parseFloat(e.target.value) || 0 })} /></div>
                    <Button onClick={createSponsor}>Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Tier</TableHead><TableHead>Booth</TableHead><TableHead>Amount Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sponsors.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge className={tierColor(s.tier)}>{s.tier}</Badge></TableCell>
                      <TableCell>{s.booth_location || "-"}</TableCell>
                      <TableCell>₹{s.amount_paid.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Branding Placements</CardTitle></CardHeader>
            <CardContent>
              {branding.length === 0 ? <p className="text-[#888888]">No branding placements configured</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Placement</TableHead><TableHead>Impressions</TableHead><TableHead>Unique Views</TableHead><TableHead>Scans</TableHead><TableHead>Clicks</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {branding.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.placement_type}</TableCell>
                        <TableCell>{b.impressions.toLocaleString()}</TableCell>
                        <TableCell>{b.unique_views.toLocaleString()}</TableCell>
                        <TableCell>{b.scans.toLocaleString()}</TableCell>
                        <TableCell>{b.clicks.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Impressions", value: analytics?.total_impressions || 0 },
              { label: "Unique Views", value: analytics?.total_unique_views || 0 },
              { label: "Scans", value: analytics?.total_scans || 0 },
              { label: "Clicks", value: analytics?.total_clicks || 0 },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{k.value.toLocaleString()}</p><p className="text-sm text-[#888888]">{k.label}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>ROI Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-[#888888]">Analytics will populate once sponsor scans and impressions are recorded.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scans" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Recent Scans</CardTitle></CardHeader>
            <CardContent>
              <p className="text-[#888888]">Scan activity will appear here once sponsors are scanned at the event.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

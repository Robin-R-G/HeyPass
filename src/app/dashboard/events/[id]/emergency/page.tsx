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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Incident { id: string; incident_type: string; severity: string; title: string; description: string; location: string; reported_by: string; status: string; created_at: string; }
interface Contact { id: string; name: string; role: string; phone: string; is_primary: boolean; }
interface LostItem { id: string; item_description: string; reported_by: string; contact_info: string; location_found: string; status: string; created_at: string; }

export default function EmergencyPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({ incident_type: "medical", severity: "medium", title: "", description: "", location: "" });
  const [newLost, setNewLost] = useState({ item_description: "", reported_by: "", contact_info: "", location_found: "" });

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/emergency/incidents`).then(r => r.json()),
      fetch(`/api/events/${eventId}/emergency/contacts`).then(r => r.json()),
      fetch(`/api/events/${eventId}/emergency/lost-found`).then(r => r.json()),
    ]).then(([iData, cData, lData]) => {
      setIncidents(iData.incidents || []);
      setContacts(cData.contacts || []);
      setLostItems(lData.items || lData.lost_items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [eventId]);

  const createIncident = async () => {
    await fetch(`/api/events/${eventId}/emergency/incidents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newIncident) });
    setCreateOpen(false);
    const data = await fetch(`/api/events/${eventId}/emergency/incidents`).then(r => r.json());
    setIncidents(data.incidents || []);
  };

  const createLost = async () => {
    await fetch(`/api/events/${eventId}/emergency/lost-found`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newLost) });
    setLostOpen(false);
    const data = await fetch(`/api/events/${eventId}/emergency/lost-found`).then(r => r.json());
    setLostItems(data.items || data.lost_items || []);
  };

  const resolveIncident = async (incidentId: string) => {
    await fetch(`/api/events/${eventId}/emergency/incidents/${incidentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "resolved" }) });
    const data = await fetch(`/api/events/${eventId}/emergency/incidents`).then(r => r.json());
    setIncidents(data.incidents || []);
  };

  const resolveLost = async (itemId: string) => {
    await fetch(`/api/events/${eventId}/emergency/lost-found/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "returned" }) });
    const data = await fetch(`/api/events/${eventId}/emergency/lost-found`).then(r => r.json());
    setLostItems(data.items || data.lost_items || []);
  };

  const severityColor = (s: string) => {
    switch (s) { case "critical": return "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"; case "high": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; case "medium": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; default: return "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]"; }
  };
  const statusColor = (s: string) => {
    switch (s) { case "resolved": return "bg-[rgba(16,185,129,0.15)] text-[#10b981]"; case "in_progress": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; case "reported": return "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"; default: return "bg-[rgba(229,229,229,0.08)] text-white"; }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="p-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Emergency</span>
      </nav>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Emergency Dashboard</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${eventId}/dashboard`}><Button variant="outline" size="sm">Event</Button></Link>
          <Link href={`/dashboard/events/${eventId}/emergency`}><Button size="sm">Emergency</Button></Link>
        </div>
      </div>
      <Tabs defaultValue="incidents">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="lost-found">Lost & Found</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", value: incidents.length, color: "text-white" },
              { label: "Open", value: incidents.filter(i => i.status === "reported" || i.status === "in_progress").length, color: "text-red-600" },
              { label: "Critical", value: incidents.filter(i => i.severity === "critical").length, color: "text-red-600" },
              { label: "Resolved", value: incidents.filter(i => i.status === "resolved").length, color: "text-green-600" },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p><p className="text-sm text-[#888888]">{k.label}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Incidents</CardTitle>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild><Button>Report Incident</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Type</Label>
                      <Select value={newIncident.incident_type} onValueChange={v => setNewIncident({ ...newIncident, incident_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medical">Medical</SelectItem><SelectItem value="security">Security</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="electrical">Electrical</SelectItem><SelectItem value="crowd">Crowd Control</SelectItem><SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Severity</Label>
                      <Select value={newIncident.severity} onValueChange={v => setNewIncident({ ...newIncident, severity: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Title</Label><Input value={newIncident.title} onChange={e => setNewIncident({ ...newIncident, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={newIncident.description} onChange={e => setNewIncident({ ...newIncident, description: e.target.value })} /></div>
                    <div><Label>Location</Label><Input value={newIncident.location} onChange={e => setNewIncident({ ...newIncident, location: e.target.value })} /></div>
                    <Button onClick={createIncident}>Submit</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {incidents.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.title}</TableCell>
                      <TableCell>{i.incident_type}</TableCell>
                      <TableCell><Badge className={severityColor(i.severity)}>{i.severity}</Badge></TableCell>
                      <TableCell>{i.location}</TableCell>
                      <TableCell><Badge className={statusColor(i.status)}>{i.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(i.created_at).toLocaleString()}</TableCell>
                      <TableCell>{i.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => resolveIncident(i.id)}>Resolve</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Emergency Contacts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Phone</TableHead><TableHead>Primary</TableHead></TableRow></TableHeader>
                <TableBody>
                  {contacts.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.role}</TableCell>
                      <TableCell className="font-mono">{c.phone}</TableCell>
                      <TableCell>{c.is_primary && <Badge>Primary</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lost-found" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lost & Found ({lostItems.length})</CardTitle>
              <Dialog open={lostOpen} onOpenChange={setLostOpen}>
                <DialogTrigger asChild><Button>Report Item</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Report Lost/Found Item</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Item Description</Label><Textarea value={newLost.item_description} onChange={e => setNewLost({ ...newLost, item_description: e.target.value })} /></div>
                    <div><Label>Reported By</Label><Input value={newLost.reported_by} onChange={e => setNewLost({ ...newLost, reported_by: e.target.value })} /></div>
                    <div><Label>Contact Info</Label><Input value={newLost.contact_info} onChange={e => setNewLost({ ...newLost, contact_info: e.target.value })} /></div>
                    <div><Label>Location Found</Label><Input value={newLost.location_found} onChange={e => setNewLost({ ...newLost, location_found: e.target.value })} /></div>
                    <Button onClick={createLost}>Submit</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Reported By</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {lostItems.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.item_description}</TableCell>
                      <TableCell>{l.reported_by}</TableCell>
                      <TableCell>{l.location_found}</TableCell>
                      <TableCell><Badge className={l.status === "returned" ? "bg-[rgba(16,185,129,0.15)] text-[#10b981]" : "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"}>{l.status}</Badge></TableCell>
                      <TableCell>{l.status !== "returned" && <Button size="sm" variant="outline" onClick={() => resolveLost(l.id)}>Mark Returned</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Incident Timeline</CardTitle></CardHeader>
            <CardContent>
              <p className="text-[#888888]">Timeline view will show chronological incident history as events are reported.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

interface Volunteer { id: string; first_name: string; last_name: string; email: string; phone: string; status: string; checked_in_at: string | null; checked_out_at: string | null; }
interface VolunteerTask { id: string; title: string; task_type: string; start_time: string; end_time: string; slots_total: number; slots_filled: number; is_active: boolean; location?: string; description?: string; }
interface VolunteerStats { total: number; approved: number; pending: number; checked_in: number; tasks_total: number; tasks_filled: number; }

export default function VolunteerPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", task_type: "general", task_location: "", start_time: "", end_time: "", slots_total: 1 });
  const [msgGroup, setMsgGroup] = useState("all");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/volunteers`).then(r => r.json()),
      fetch(`/api/events/${eventId}/volunteers/tasks`).then(r => r.json()),
      fetch(`/api/events/${eventId}/volunteers/analytics`).then(r => r.json()),
    ]).then(([vData, tData, sData]) => {
      setVolunteers(vData.volunteers || []);
      setTasks(tData.tasks || []);
      setStats(sData.stats || { total: 0, approved: 0, pending: 0, checked_in: 0, tasks_total: 0, tasks_filled: 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [eventId]);

  const createTask = async () => {
    await fetch(`/api/events/${eventId}/volunteers/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newTask, location: newTask.task_location }) });
    setTaskDialogOpen(false);
    const tData = await fetch(`/api/events/${eventId}/volunteers/tasks`).then(r => r.json());
    setTasks(tData.tasks || []);
  };

  const sendMessage = async () => {
    if (!msgSubject || !msgBody) return;
    setSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/volunteers/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: msgGroup, subject: msgSubject, message: msgBody }),
      });
      const data = await res.json();
      setSendResult({ success: res.ok, message: res.ok ? `Message sent to ${data.sent || 'volunteers'}` : (data.error || "Failed to send") });
      if (res.ok) { setMsgSubject(""); setMsgBody(""); }
    } catch {
      setSendResult({ success: false, message: "Network error" });
    }
    setSending(false);
  };

  const filtered = volunteers.filter(v => `${v.first_name} ${v.last_name} ${v.email}`.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    switch (s) { case "approved": return "bg-[rgba(16,185,129,0.15)] text-[#10b981]"; case "pending": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; case "checked_in": return "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]"; case "completed": return "bg-[rgba(229,229,229,0.08)] text-[#E5E5E5]"; default: return "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"; }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="p-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Volunteers</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Volunteer Management</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${eventId}/dashboard`}><Button variant="outline" size="sm">Event</Button></Link>
          <Link href={`/dashboard/events/[id]/crm`} as={`/dashboard/events/${eventId}/crm`}><Button variant="outline" size="sm">CRM Portal</Button></Link>
          <Link href={`/dashboard/events/${eventId}/volunteers`}><Button size="sm">Volunteers</Button></Link>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="communicate">Communicate</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Total", value: stats?.total || 0 },
              { label: "Approved", value: stats?.approved || 0 },
              { label: "Pending", value: stats?.pending || 0 },
              { label: "Checked In", value: stats?.checked_in || 0 },
              { label: "Tasks", value: stats?.tasks_total || 0 },
              { label: "Slots Filled", value: stats?.tasks_filled || 0 },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-sm text-[#888888]">{k.label}</p>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="volunteers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Volunteers ({volunteers.length})</CardTitle>
              <Input placeholder="Search..." className="w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Checked In</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>{v.first_name} {v.last_name}</TableCell>
                      <TableCell>{v.email}</TableCell>
                      <TableCell>{v.phone || "-"}</TableCell>
                      <TableCell><Badge className={statusColor(v.status)}>{v.status}</Badge></TableCell>
                      <TableCell>{v.checked_in_at ? new Date(v.checked_in_at).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tasks ({tasks.length})</CardTitle>
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild><Button>Create Task</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Volunteer Task</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Title</Label><Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} /></div>
                    <div><Label>Type</Label>
                      <Select value={newTask.task_type} onValueChange={v => setNewTask({ ...newTask, task_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["general", "registration", "usher", "stage", "hospitality", "security", "transport", "media"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Location</Label><Input value={newTask.task_location} onChange={e => setNewTask({ ...newTask, task_location: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Start</Label><Input type="datetime-local" value={newTask.start_time} onChange={e => setNewTask({ ...newTask, start_time: e.target.value })} /></div>
                      <div><Label>End</Label><Input type="datetime-local" value={newTask.end_time} onChange={e => setNewTask({ ...newTask, end_time: e.target.value })} /></div>
                    </div>
                    <div><Label>Slots</Label><Input type="number" value={newTask.slots_total} onChange={e => setNewTask({ ...newTask, slots_total: parseInt(e.target.value) || 1 })} /></div>
                    <Button onClick={createTask}>Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Slots</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tasks.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell><Badge variant="outline">{t.task_type}</Badge></TableCell>
                      <TableCell>{t.location || "-"}</TableCell>
                      <TableCell>{t.slots_filled}/{t.slots_total}</TableCell>
                      <TableCell>{new Date(t.start_time).toLocaleString()}</TableCell>
                      <TableCell>{new Date(t.end_time).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
            <CardContent>
              {tasks.length === 0 ? <p className="text-[#888888]">No tasks scheduled</p> : (
                <div className="space-y-4">
                  {tasks.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map(t => (
                    <div key={t.id} className="border-[rgba(229,229,229,0.12)] rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{t.title}</p>
                          <p className="text-sm text-[#888888]">{t.location || "No location"}</p>
                        </div>
                        <Badge className={t.slots_filled >= t.slots_total ? "bg-[rgba(16,185,129,0.15)] text-[#10b981]" : "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"}>
                          {t.slots_filled}/{t.slots_total} slots
                        </Badge>
                      </div>
                      <p className="text-sm text-[#888888] mt-2">{new Date(t.start_time).toLocaleString()} - {new Date(t.end_time).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communicate" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Bulk Communication</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Recipient Group</Label>
                <Select value={msgGroup} onValueChange={setMsgGroup}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Volunteers</SelectItem>
                    <SelectItem value="approved">Approved Only</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label><Input placeholder="Message subject..." value={msgSubject} onChange={e => setMsgSubject(e.target.value)} /></div>
              <div><Label>Message</Label><Input placeholder="Type your message..." value={msgBody} onChange={e => setMsgBody(e.target.value)} /></div>
              <Button onClick={sendMessage} disabled={!msgSubject || !msgBody || sending}>
                {sending ? "Sending..." : "Send Message"}
              </Button>
              {sendResult && (
                <div className={`border-[rgba(229,229,229,0.12)] rounded-lg p-3 ${sendResult.success ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]"}`}>
                  <p className={`font-medium text-sm ${sendResult.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>{sendResult.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

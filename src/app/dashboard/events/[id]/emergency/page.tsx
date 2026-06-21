'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  location: string;
  status: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  is_primary: boolean;
}

interface LostFoundItem {
  id: string;
  item_description: string;
  category: string;
  found_location: string;
  found_at: string;
  reported_by_name: string;
  reported_by_phone: string;
  claimed_by_name: string;
  claimed_at: string;
  status: string;
}

interface EmergencyStats {
  active_by_severity: { severity: string; count: number }[];
  active_by_type: { type: string; count: number }[];
  total_active: number;
  total_resolved_today: number;
  total_resolved: number;
  avg_response_time_minutes: number;
  lost_found_pending: number;
  lost_found_total: number;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  found: 'bg-blue-100 text-blue-800',
  claimed: 'bg-yellow-100 text-yellow-800',
  returned: 'bg-green-100 text-green-800',
  disposed: 'bg-gray-100 text-gray-800',
};

const contactRoleColors: Record<string, string> = {
  police: 'bg-blue-100 text-blue-800',
  fire: 'bg-red-100 text-red-800',
  medical: 'bg-green-100 text-green-800',
  ambulance: 'bg-green-100 text-green-800',
  organizer: 'bg-purple-100 text-purple-800',
  security: 'bg-orange-100 text-orange-800',
};

const typeLabels: Record<string, string> = {
  medical: 'Medical',
  security: 'Security',
  evacuation: 'Evacuation',
  facility: 'Facility',
  lost_found: 'Lost & Found',
  other: 'Other',
};

export default function EmergencyPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [stats, setStats] = useState<EmergencyStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [lostFoundItems, setLostFoundItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showLostFoundDialog, setShowLostFoundDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [incidentForm, setIncidentForm] = useState({
    title: '',
    incident_type: 'medical',
    severity: 'medium',
    description: '',
    location: '',
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    role: 'organizer',
    phone: '',
    email: '',
    location: '',
  });
  const [lostFoundForm, setLostFoundForm] = useState({
    item_description: '',
    category: 'other',
    found_location: '',
    reported_by_name: '',
    reported_by_phone: '',
  });
  const [claimForm, setClaimForm] = useState({ claimed_by_name: '' });

  useEffect(() => {
    fetchStats();
    fetchIncidents();
    fetchContacts();
    fetchLostFound();
  }, [eventId]);

  async function fetchStats() {
    try {
      const res = await fetch(`/api/events/${eventId}/emergency/stats`);
      const data = await res.json();
      setStats(data.data?.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchIncidents() {
    try {
      const res = await fetch(`/api/events/${eventId}/emergency/incidents`);
      const data = await res.json();
      setIncidents(data.data?.incidents || []);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch(`/api/events/${eventId}/emergency/contacts`);
      const data = await res.json();
      setContacts(data.data?.contacts || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  }

  async function fetchLostFound() {
    try {
      const res = await fetch(`/api/events/${eventId}/emergency/lost-found`);
      const data = await res.json();
      setLostFoundItems(data.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch lost found:', err);
    }
  }

  async function createIncident() {
    try {
      await fetch(`/api/events/${eventId}/emergency/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentForm),
      });
      setShowIncidentDialog(false);
      setIncidentForm({ title: '', incident_type: 'medical', severity: 'medium', description: '', location: '' });
      fetchIncidents();
      fetchStats();
    } catch (err) {
      console.error('Failed to create incident:', err);
    }
  }

  async function updateIncidentStatus(incidentId: string, status: string) {
    try {
      await fetch(`/api/events/${eventId}/emergency/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchIncidents();
      fetchStats();
    } catch (err) {
      console.error('Failed to update incident:', err);
    }
  }

  async function createContact() {
    try {
      await fetch(`/api/events/${eventId}/emergency/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      setShowContactDialog(false);
      setContactForm({ name: '', role: 'organizer', phone: '', email: '', location: '' });
      fetchContacts();
    } catch (err) {
      console.error('Failed to create contact:', err);
    }
  }

  async function createLostFound() {
    try {
      await fetch(`/api/events/${eventId}/emergency/lost-found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lostFoundForm),
      });
      setShowLostFoundDialog(false);
      setLostFoundForm({ item_description: '', category: 'other', found_location: '', reported_by_name: '', reported_by_phone: '' });
      fetchLostFound();
      fetchStats();
    } catch (err) {
      console.error('Failed to create lost found:', err);
    }
  }

  async function claimItem() {
    if (!selectedItemId) return;
    try {
      await fetch(`/api/events/${eventId}/emergency/lost-found/${selectedItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'claimed',
          claimed_by_name: claimForm.claimed_by_name,
          claimed_at: new Date().toISOString(),
        }),
      });
      setShowClaimDialog(false);
      setSelectedItemId(null);
      setClaimForm({ claimed_by_name: '' });
      fetchLostFound();
      fetchStats();
    } catch (err) {
      console.error('Failed to claim item:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading emergency dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Emergency Dashboard</h1>
        <Badge variant="destructive" className="text-sm">
          {stats?.total_active || 0} Active Incidents
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="lost-found">Lost & Found</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-red-600">
                      {stats.active_by_severity.find((s) => s.severity === 'critical')?.count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Critical</div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-orange-600">
                      {stats.active_by_severity.find((s) => s.severity === 'high')?.count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">High</div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-yellow-600">
                      {stats.active_by_severity.find((s) => s.severity === 'medium')?.count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Medium</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.active_by_severity.find((s) => s.severity === 'low')?.count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Low</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.total_active}</div>
                    <div className="text-sm text-muted-foreground">Total Active</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.total_resolved_today}</div>
                    <div className="text-sm text-muted-foreground">Resolved Today</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.avg_response_time_minutes}m</div>
                    <div className="text-sm text-muted-foreground">Avg Response Time</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.lost_found_pending}</div>
                    <div className="text-sm text-muted-foreground">Lost & Found Pending</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Active Incidents by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.active_by_type.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No active incidents</div>
                  ) : (
                    <div className="space-y-2">
                      {stats.active_by_type.map((t) => (
                        <div key={t.type} className="flex items-center gap-2">
                          <span className="text-sm w-24">{typeLabels[t.type] || t.type}</span>
                          <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{
                                width: `${(t.count / Math.max(stats.total_active, 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-mono w-8 text-right">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
              <DialogTrigger asChild>
                <Button>Create Incident</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Incident</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={incidentForm.title}
                      onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
                      placeholder="Incident title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={incidentForm.incident_type}
                        onValueChange={(v) => setIncidentForm({ ...incidentForm, incident_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="evacuation">Evacuation</SelectItem>
                          <SelectItem value="facility">Facility</SelectItem>
                          <SelectItem value="lost_found">Lost & Found</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select
                        value={incidentForm.severity}
                        onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={incidentForm.location}
                      onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                      placeholder="Location"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={incidentForm.description}
                      onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                      placeholder="Description"
                    />
                  </div>
                  <Button onClick={createIncident} className="w-full">
                    Report Incident
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Severity</th>
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          No incidents reported
                        </td>
                      </tr>
                    ) : (
                      incidents.map((incident) => (
                        <tr key={incident.id} className="border-b">
                          <td className="p-3">
                            <Badge className={severityColors[incident.severity]}>
                              {incident.severity}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium">{incident.title}</td>
                          <td className="p-3">{typeLabels[incident.incident_type]}</td>
                          <td className="p-3 text-muted-foreground">{incident.location || '-'}</td>
                          <td className="p-3">
                            <Badge className={statusColors[incident.status]}>
                              {incident.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(incident.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            {incident.status === 'open' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateIncidentStatus(incident.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                            {incident.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                              >
                                Resolve
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lost & Found Tab */}
        <TabsContent value="lost-found" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={showLostFoundDialog} onOpenChange={setShowLostFoundDialog}>
              <DialogTrigger asChild>
                <Button>Report Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Lost/Found Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Item Description</Label>
                    <Textarea
                      value={lostFoundForm.item_description}
                      onChange={(e) =>
                        setLostFoundForm({ ...lostFoundForm, item_description: e.target.value })
                      }
                      placeholder="Describe the item"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={lostFoundForm.category}
                        onValueChange={(v) => setLostFoundForm({ ...lostFoundForm, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="documents">Documents</SelectItem>
                          <SelectItem value="bags">Bags</SelectItem>
                          <SelectItem value="keys">Keys</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Found Location</Label>
                      <Input
                        value={lostFoundForm.found_location}
                        onChange={(e) =>
                          setLostFoundForm({ ...lostFoundForm, found_location: e.target.value })
                        }
                        placeholder="Location found"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reported By</Label>
                      <Input
                        value={lostFoundForm.reported_by_name}
                        onChange={(e) =>
                          setLostFoundForm({ ...lostFoundForm, reported_by_name: e.target.value })
                        }
                        placeholder="Name"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={lostFoundForm.reported_by_phone}
                        onChange={(e) =>
                          setLostFoundForm({ ...lostFoundForm, reported_by_phone: e.target.value })
                        }
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                  <Button onClick={createLostFound} className="w-full">
                    Report Item
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Claim Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Claimed By</Label>
                  <Input
                    value={claimForm.claimed_by_name}
                    onChange={(e) => setClaimForm({ claimed_by_name: e.target.value })}
                    placeholder="Full name of person claiming"
                  />
                </div>
                <Button onClick={claimItem} className="w-full">
                  Confirm Claim
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Item</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Reported By</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lostFoundItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          No items reported
                        </td>
                      </tr>
                    ) : (
                      lostFoundItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-3 font-medium max-w-[200px] truncate">
                            {item.item_description}
                          </td>
                          <td className="p-3 capitalize">{item.category}</td>
                          <td className="p-3 text-muted-foreground">{item.found_location || '-'}</td>
                          <td className="p-3 text-muted-foreground">{item.reported_by_name || '-'}</td>
                          <td className="p-3">
                            <Badge className={statusColors[item.status]}>{item.status}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            {item.status === 'found' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setShowClaimDialog(true);
                                }}
                              >
                                Claim
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
              <DialogTrigger asChild>
                <Button>Add Contact</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emergency Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Contact name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Role</Label>
                      <Select
                        value={contactForm.role}
                        onValueChange={(v) => setContactForm({ ...contactForm, role: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="police">Police</SelectItem>
                          <SelectItem value="fire">Fire</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="ambulance">Ambulance</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="organizer">Organizer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="Email (optional)"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={contactForm.location}
                      onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                      placeholder="Location (optional)"
                    />
                  </div>
                  <Button onClick={createContact} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No emergency contacts added
                </CardContent>
              </Card>
            ) : (
              contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <Badge className={contactRoleColors[contact.role]} variant="outline">
                          {contact.role}
                        </Badge>
                      </div>
                      {contact.is_primary && (
                        <Badge variant="default">Primary</Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <div>Phone: {contact.phone}</div>
                      {contact.email && <div>Email: {contact.email}</div>}
                      {contact.location && <div>Location: {contact.location}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users, MessageSquare, Send, TrendingUp, Bot, Sparkles, Clock, ClipboardList,
  Volume2, Plus, Search, Award, Star, Settings, ChevronRight, User, Briefcase,
  Building, CheckCircle2, AlertTriangle, ShieldCheck, Mail, Phone, DollarSign, Calendar
} from 'lucide-react';

export default function CRMDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  // Tabs states
  const [activeTab, setActiveTab] = useState('analytics');

  // Unified lists
  const [contacts, setContacts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactProfile, setSelectedContactProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Workflow states
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);

  // Campaign states
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Feedback states
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Simulation inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('event');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Forms
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', organization: '', designation: '', tags: '', notes: '' });
  const [newWorkflow, setNewWorkflow] = useState({ name: '', triggerType: 'registration_complete', templateName: '', delayMinutes: 0 });
  const [newCampaign, setNewCampaign] = useState({ name: '', templateId: '', targetSegment: 'all', variables: ['{{name}}'] });
  const [newFeedback, setNewFeedback] = useState({ email: '', rating: '5', comments: '' });

  // Inbox messaging states
  const [activeChatContactId, setActiveChatContactId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [chatAssignee, setChatAssignee] = useState('unassigned');
  const [chatStatus, setChatStatus] = useState('active');

  // Simulator helper inputs
  const [simText, setSimText] = useState('');

  // Fetching triggers
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/crm/contacts?scope=${scopeFilter}&search=${searchQuery}&type=${typeFilter}&status=${statusFilter}`);
      const json = await res.json();
      if (json.data?.contacts) setContacts(json.data.contacts);
    } catch (e) {
      console.error('Failed to load contacts', e);
    }
  }, [eventId, scopeFilter, searchQuery, typeFilter, statusFilter]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/crm/whatsapp/messages`);
      const json = await res.json();
      if (json.data?.conversations) setConversations(json.data.conversations);
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
  }, [eventId]);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/crm/workflows`);
      const json = await res.json();
      if (json.data) {
        setWorkflows(json.data.workflows || []);
        setWorkflowRuns(json.data.runs || []);
      }
    } catch (e) {
      console.error('Failed to load workflows', e);
    }
  }, [eventId]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/crm/whatsapp/campaigns`);
      const json = await res.json();
      if (json.data) {
        setCampaigns(json.data.campaigns || []);
        setTemplates(json.data.templates || []);
      }
    } catch (e) {
      console.error('Failed to load campaigns', e);
    }
  }, [eventId]);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/crm/feedback`);
      const json = await res.json();
      if (json.data?.feedbacks) setFeedbacks(json.data.feedbacks);
    } catch (e) {
      console.error('Failed to load feedbacks', e);
    }
  }, [eventId]);

  // Initial loading
  useEffect(() => {
    fetchContacts();
    fetchConversations();
    fetchWorkflows();
    fetchCampaigns();
    fetchFeedbacks();
  }, [fetchContacts, fetchConversations, fetchWorkflows, fetchCampaigns, fetchFeedbacks]);

  // Contact details fetcher
  const openContactProfile = async (contactId: string) => {
    setSelectedContactId(contactId);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/crm/contacts/${contactId}`);
      const json = await res.json();
      if (json.data) {
        setSelectedContactProfile(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch contact details', e);
    } finally {
      setProfileLoading(false);
    }
  };

  // Outbox Chat fetcher
  const openChatThread = async (contactId: string) => {
    setActiveChatContactId(contactId);
    try {
      const res = await fetch(`/api/events/${eventId}/crm/whatsapp/messages?contactId=${contactId}`);
      const json = await res.json();
      if (json.data?.history) {
        setChatMessages(json.data.history);
      }
    } catch (e) {
      console.error('Failed to fetch chat logs', e);
    }
  };

  // Submit manual outbound WhatsApp message
  const sendOutboundReply = async () => {
    if (!activeChatContactId || !replyText.trim()) return;

    try {
      const res = await fetch(`/api/events/${eventId}/crm/whatsapp/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: activeChatContactId,
          text: replyText,
        }),
      });
      const json = await res.json();
      if (json.data?.message) {
        setReplyText('');
        openChatThread(activeChatContactId);
        fetchConversations();
      }
    } catch (e) {
      console.error('Failed to dispatch reply', e);
    }
  };

  // Submit simulator inbound webhook message
  const triggerSimulatedInbound = async () => {
    if (!activeChatContactId || !simText.trim()) return;

    try {
      await fetch(`/api/events/${eventId}/crm/whatsapp/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: activeChatContactId,
          text: simText,
          simulate_direction: 'inbound',
        }),
      });
      setSimText('');
      openChatThread(activeChatContactId);
      fetchConversations();
    } catch (e) {
      console.error('Failed to trigger simulation', e);
    }
  };

  // Create a new contact manually
  const handleCreateContact = async () => {
    try {
      const tagsArray = newContact.tags.split(',').map(t => t.trim()).filter(Boolean);
      await fetch(`/api/events/${eventId}/crm/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newContact,
          tags: tagsArray,
        }),
      });
      setNewContact({ name: '', email: '', phone: '', organization: '', designation: '', tags: '', notes: '' });
      fetchContacts();
    } catch (e) {
      console.error('Failed to create contact', e);
    }
  };

  // Submit Campaign Broadcast
  const handleLaunchCampaign = async () => {
    try {
      await fetch(`/api/events/${eventId}/crm/whatsapp/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaign.name,
          templateId: newCampaign.templateId,
          targetSegment: newCampaign.targetSegment,
          variables: newCampaign.variables,
        }),
      });
      setNewCampaign({ name: '', templateId: '', targetSegment: 'all', variables: ['{{name}}'] });
      fetchCampaigns();
    } catch (e) {
      console.error('Failed to launch campaign', e);
    }
  };

  // Create Automated Journey / Workflow
  const handleCreateWorkflow = async () => {
    try {
      await fetch(`/api/events/${eventId}/crm/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflow.name,
          triggerType: newWorkflow.triggerType,
          actions: [
            {
              type: 'whatsapp',
              template_name: newWorkflow.templateName,
              variables: ['{{name}}'],
              delay_minutes: parseInt(newWorkflow.delayMinutes as any) || 0,
            }
          ],
        }),
      });
      setNewWorkflow({ name: '', triggerType: 'registration_complete', templateName: '', delayMinutes: 0 });
      fetchWorkflows();
    } catch (e) {
      console.error('Failed to build workflow', e);
    }
  };

  // Submit mock event feedback
  const handleCreateFeedback = async () => {
    try {
      await fetch(`/api/events/${eventId}/crm/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newFeedback.email,
          rating: parseInt(newFeedback.rating),
          comments: newFeedback.comments,
        }),
      });
      setNewFeedback({ email: '', rating: '5', comments: '' });
      fetchFeedbacks();
      fetchContacts();
    } catch (e) {
      console.error('Failed to submit feedback', e);
    }
  };

  // Helper colors
  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 40) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const getScoreTier = (score: number) => {
    if (score >= 80) return 'Platinum';
    if (score >= 50) return 'Gold';
    if (score >= 25) return 'Silver';
    return 'Bronze';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#08080c', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="p-6">
      {/* Page Navigation */}
      <nav className="flex items-center gap-2 mb-4 text-sm text-[#888888]">
        <button onClick={() => router.back()} className="hover:text-white transition-colors cursor-pointer">← Back</button>
        <span>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} className="hover:text-white transition-colors">Event</Link>
        <span>/</span>
        <span className="text-[#FCA311] font-medium">CRM Portal</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#E5E5E5] to-slate-500 bg-clip-text text-transparent">
              Event CRM & Communication Engine
            </h1>
            <Badge variant="outline" className="bg-[#FCA311]/10 text-[#FCA311] border-[#FCA311]/20 font-semibold px-2 py-0.5 text-xs">
              SaaS Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Build long-term retention, manage automated messaging templates, and view comprehensive contact lifecycle logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${eventId}/dashboard`}><Button variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900">Attendance</Button></Link>
          <Link href={`/dashboard/events/${eventId}/sponsors`}><Button variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900">Sponsors</Button></Link>
          <Link href={`/dashboard/events/${eventId}/volunteers`}><Button variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900">Volunteers</Button></Link>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="analytics" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-950/60 p-1 border border-slate-900/60 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <TrendingUp className="w-4 h-4 mr-1.5 inline" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <Users className="w-4 h-4 mr-1.5 inline" /> Contacts Directory
          </TabsTrigger>
          <TabsTrigger value="inbox" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <MessageSquare className="w-4 h-4 mr-1.5 inline" /> Shared Inbox
          </TabsTrigger>
          <TabsTrigger value="workflows" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <Bot className="w-4 h-4 mr-1.5 inline" /> Automated Journeys
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <Volume2 className="w-4 h-4 mr-1.5 inline" /> Broadcast Campaign
          </TabsTrigger>
          <TabsTrigger value="volunteers" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <ClipboardList className="w-4 h-4 mr-1.5 inline" /> Volunteers & Staff
          </TabsTrigger>
          <TabsTrigger value="sponsors" className="data-[state=active]:bg-[#FCA311] data-[state=active]:text-black text-xs md:text-sm py-1.5 px-3 rounded">
            <Star className="w-4 h-4 mr-1.5 inline" /> Speakers & Sponsors
          </TabsTrigger>
        </TabsList>

        {/* ==============================================
            TAB 1: ANALYTICS
            ============================================== */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-500">Total CRM Contacts</CardDescription>
                <CardTitle className="text-3xl font-bold">{contacts.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" /> +14.2% Growth
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-500">Avg Engagement Score</CardDescription>
                <CardTitle className="text-3xl font-bold">
                  {contacts.length > 0
                    ? Math.round(contacts.reduce((acc, c) => acc + (c.engagement_score || 0), 0) / contacts.length)
                    : 0} pts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-400">Score of all contacts inside system</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-500">WhatsApp Delivery Rate</CardDescription>
                <CardTitle className="text-3xl font-bold">98.4%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> API Connected (Meta)
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-500">WhatsApp Read Rate</CardDescription>
                <CardTitle className="text-3xl font-bold">84.1%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#FCA311]">Highly active response rate</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feedback stats */}
            <Card className="bg-slate-950/60 border-slate-900 md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Attendee Feedback Summary</CardTitle>
                  <CardDescription>Average ratings and logs gathered from feedback submissions.</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Log Feedback</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                      <DialogTitle>Mock Attendee Feedback Submission</DialogTitle>
                      <DialogDescription className="text-slate-400">Simulate attendee feedback to trigger CRM points recalculation.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Attendee Email</Label>
                        <Input value={newFeedback.email} onChange={e => setNewFeedback({ ...newFeedback, email: e.target.value })} placeholder="john@example.com" />
                      </div>
                      <div>
                        <Label>Rating (1 to 5 Stars)</Label>
                        <Select value={newFeedback.rating} onValueChange={v => setNewFeedback({ ...newFeedback, rating: v })}>
                          <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="5">⭐⭐⭐⭐⭐ (5 Stars)</SelectItem>
                            <SelectItem value="4">⭐⭐⭐⭐ (4 Stars)</SelectItem>
                            <SelectItem value="3">⭐⭐⭐ (3 Stars)</SelectItem>
                            <SelectItem value="2">⭐⭐ (2 Stars)</SelectItem>
                            <SelectItem value="1">⭐ (1 Star)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Comments</Label>
                        <Textarea value={newFeedback.comments} onChange={e => setNewFeedback({ ...newFeedback, comments: e.target.value })} placeholder="Excellent event organization..." />
                      </div>
                      <Button onClick={handleCreateFeedback} className="bg-[#FCA311] text-black hover:bg-[#E09800]">Submit</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {feedbacks.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No feedbacks submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center p-3 bg-slate-900/40 rounded border border-slate-800/40">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-[#FCA311]">
                          {(feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-500">out of 5.0</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">Highly Satisfied Attendees</div>
                        <div className="text-xs text-slate-400">Recalculated dynamically based on {feedbacks.length} reviews</div>
                      </div>
                    </div>
                    <Table>
                      <TableHeader className="border-slate-800">
                        <TableRow className="border-slate-800">
                          <TableHead className="text-slate-400">Attendee</TableHead>
                          <TableHead className="text-slate-400">Rating</TableHead>
                          <TableHead className="text-slate-400">Comments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbacks.map((f, idx) => (
                          <TableRow key={idx} className="border-slate-900 hover:bg-slate-900/20">
                            <TableCell className="font-medium text-white">
                              {f.registration?.first_name} {f.registration?.last_name}
                              <div className="text-xs text-slate-500">{f.registration?.email}</div>
                            </TableCell>
                            <TableCell className="text-[#FCA311]">{'★'.repeat(f.rating)}</TableCell>
                            <TableCell className="text-slate-300 text-xs italic">{f.comments || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement tiers */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader>
                <CardTitle>Community Segments</CardTitle>
                <CardDescription>Contact distribution by engagement score levels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { segment: 'Highly Engaged (80+ pts)', count: contacts.filter(c => c.engagement_score >= 80).length, percent: 80, color: 'bg-emerald-500' },
                  { segment: 'Active Participants (40-79 pts)', count: contacts.filter(c => c.engagement_score >= 40 && c.engagement_score < 80).length, percent: 50, color: 'bg-amber-500' },
                  { segment: 'Inactive / Leads (< 40 pts)', count: contacts.filter(c => c.engagement_score < 40).length, percent: 20, color: 'bg-slate-500' },
                ].map(s => {
                  const total = contacts.length || 1;
                  const ratio = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.segment}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{s.segment}</span>
                        <span className="font-semibold">{s.count} ({ratio}%)</span>
                      </div>
                      <div className="h-2 rounded bg-slate-900 overflow-hidden">
                        <div className={`h-full ${s.color}`} style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==============================================
            TAB 2: CONTACTS DIRECTORY & DRAWER
            ============================================== */}
        <TabsContent value="contacts" className="space-y-6 mt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <Input
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); }}
                  placeholder="Search contacts..."
                  className="bg-slate-900 border-slate-800 text-white pl-9 h-9"
                />
              </div>

              <Select value={scopeFilter} onValueChange={v => { setScopeFilter(v); }}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-9 w-32"><SelectValue placeholder="Scope" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="event">This Event</SelectItem>
                  <SelectItem value="all">All Contacts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); }}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-9 w-32"><SelectValue placeholder="Role Type" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value=" ">All Roles</SelectItem>
                  <SelectItem value="Attendee">Attendee</SelectItem>
                  <SelectItem value="Volunteer">Volunteer</SelectItem>
                  <SelectItem value="Speaker">Speaker</SelectItem>
                  <SelectItem value="Sponsor">Sponsor</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" onClick={fetchContacts} className="bg-slate-800 hover:bg-slate-700 h-9">Apply</Button>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[#FCA311] text-black hover:bg-[#E09800]"><Plus className="w-4 h-4 mr-1.5" /> Add Contact</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Create New CRM Contact</DialogTitle>
                  <DialogDescription className="text-slate-400">Add personal details and tags directly inside the database.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+919876543210" />
                  </div>
                  <div>
                    <Label>Organization</Label>
                    <Input value={newContact.organization} onChange={e => setNewContact({ ...newContact, organization: e.target.value })} placeholder="IEEE / College" />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={newContact.designation} onChange={e => setNewContact({ ...newContact, designation: e.target.value })} placeholder="Student / Engineer" />
                  </div>
                  <div>
                    <Label>Tags (Comma Separated)</Label>
                    <Input value={newContact.tags} onChange={e => setNewContact({ ...newContact, tags: e.target.value })} placeholder="VIP, Student, IEEE" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label>Internal Profile Notes</Label>
                    <Textarea value={newContact.notes} onChange={e => setNewContact({ ...newContact, notes: e.target.value })} placeholder="Key point of contact for tech projects..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button onClick={handleCreateContact} className="bg-[#FCA311] text-black hover:bg-[#E09800]">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contacts Table */}
            <Card className="bg-slate-950/60 border-slate-900 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>CRM Contacts Directory</CardTitle>
                <CardDescription>Directory listing of contacts matching scope criteria.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Phone</TableHead>
                      <TableHead className="text-slate-400">Score & Tier</TableHead>
                      <TableHead className="text-slate-400">Tags</TableHead>
                      <TableHead className="text-slate-400"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-6">No contacts found.</TableCell>
                      </TableRow>
                    ) : (
                      contacts.map((c: any) => (
                        <TableRow
                          key={c.id}
                          onClick={() => openContactProfile(c.id)}
                          className={`border-slate-900 cursor-pointer transition-colors ${selectedContactId === c.id ? 'bg-[#FCA311]/5 hover:bg-[#FCA311]/10' : 'hover:bg-slate-900/40'}`}
                        >
                          <TableCell className="font-semibold text-white">
                            {c.name}
                            <div className="text-xs text-slate-400">{c.email || 'No email'}</div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300">{c.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getScoreBadgeClass(c.engagement_score || 0)}>
                              {c.engagement_score || 0} ({getScoreTier(c.engagement_score || 0)})
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(c.tags || []).map((t: string) => (
                                <Badge key={t} className="bg-slate-900 border-slate-800 text-[10px] py-0.5 text-slate-400">{t}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell><ChevronRight className="w-4 h-4 text-slate-500" /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Profile Detail Drawer (Right panel context) */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader className="border-b border-slate-900">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#FCA311]" /> Relationship Profile
                </CardTitle>
                <CardDescription>Detailed attendee and customer view</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedContactId === null ? (
                  <div className="text-center text-slate-500 py-12 flex flex-col items-center justify-center gap-2">
                    <Users className="w-12 h-12 text-slate-700" />
                    <p className="text-sm">Select a contact from the directory table to inspect their lifecycle logs.</p>
                  </div>
                ) : profileLoading ? (
                  <div className="p-12 text-center text-slate-400">Loading profile data...</div>
                ) : selectedContactProfile && (
                  <div className="space-y-6">
                    {/* Header Details */}
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedContactProfile.profile.name}</h3>
                      <p className="text-xs text-slate-400">{selectedContactProfile.profile.email || 'No Email'}</p>
                      <p className="text-xs text-slate-400">{selectedContactProfile.profile.phone || 'No Phone'}</p>
                      {selectedContactProfile.profile.organization && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          {selectedContactProfile.profile.organization} {selectedContactProfile.profile.designation ? `(${selectedContactProfile.profile.designation})` : ''}
                        </div>
                      )}
                    </div>

                    {/* Engagement Metrics */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded border border-slate-800/40">
                      <div>
                        <div className="text-xs text-slate-500">Engagement Score</div>
                        <div className="text-lg font-bold text-[#FCA311]">{selectedContactProfile.profile.engagement_score || 0} pts</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Attendance Rate</div>
                        <div className="text-lg font-bold text-white">{selectedContactProfile.attendanceRate}%</div>
                      </div>
                    </div>

                    {/* AI Ready Placeholder */}
                    <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-indigo-900/40 p-3 rounded">
                      <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold mb-1">
                        <Bot className="w-4 h-4" /> AI Ready Core Infrastructure
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mt-2">
                        <div>
                          <span>Lead Scoring Rank:</span>
                          <span className="font-semibold text-white block">High Conversion Target</span>
                        </div>
                        <div>
                          <span>Recommended Campaign:</span>
                          <span className="font-semibold text-white block">Post-Event Survey</span>
                        </div>
                      </div>
                    </div>

                    {/* Timelines Accordion style summary */}
                    <div className="space-y-4 text-xs">
                      <div>
                        <h4 className="font-bold text-slate-300 mb-1">Event Registrations ({selectedContactProfile.eventHistory.length})</h4>
                        <div className="space-y-1">
                          {selectedContactProfile.eventHistory.map((reg: any, idx: number) => (
                            <div key={idx} className="flex justify-between bg-slate-900/20 p-2 rounded">
                              <span className="text-slate-300 truncate max-w-[150px]">{reg.event?.title}</span>
                              <Badge className="bg-slate-900 border-slate-800 text-[10px] text-slate-400">{reg.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedContactProfile.certificates?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-300 mb-1">Certificates Earned</h4>
                          <div className="space-y-1">
                            {selectedContactProfile.certificates.map((c: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-slate-900/20 p-2 rounded">
                                <span className="text-[#FCA311] font-mono">{c.certificate_number}</span>
                                <span className="text-[10px] text-slate-400">{c.template?.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedContactProfile.whatsappLogs?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-300 mb-1">WhatsApp Chat Log (Last 3)</h4>
                          <div className="space-y-1.5">
                            {selectedContactProfile.whatsappLogs.slice(0, 3).map((w: any, idx: number) => (
                              <div key={idx} className={`p-2 rounded text-[10px] ${w.direction === 'inbound' ? 'bg-slate-900 border-l border-emerald-500' : 'bg-slate-900/40 border-l border-slate-700'}`}>
                                <div className="flex justify-between text-slate-500 mb-1">
                                  <span>{w.direction}</span>
                                  <span>{new Date(w.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-300 italic">"{w.message_text}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==============================================
            TAB 3: SHARED INBOX (TEAM CHAT & WEBHOOK SIMULATION)
            ============================================== */}
        <TabsContent value="inbox" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left sidebar chats list */}
            <Card className="bg-slate-950/60 border-slate-900 lg:col-span-1 h-[600px] flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-900">
                <CardTitle className="text-md flex items-center justify-between">
                  <span>Active Chats</span>
                  <Badge className="bg-slate-900 text-[#FCA311] border-slate-800">{conversations.length}</Badge>
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                  <Input
                    placeholder="Search chats..."
                    className="bg-slate-900 border-slate-800 text-white pl-8 h-8 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                {conversations.length === 0 ? (
                  <p className="text-slate-600 text-center py-12 text-xs">No active threads.</p>
                ) : (
                  conversations.map((chat: any) => (
                    <div
                      key={chat.contact.id}
                      onClick={() => { openChatThread(chat.contact.id); }}
                      className={`p-3 border-b border-slate-900 cursor-pointer transition-colors ${activeChatContactId === chat.contact.id ? 'bg-[#FCA311]/5 border-r-2 border-r-[#FCA311]' : 'hover:bg-slate-900/30'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-xs text-white">{chat.contact.name}</span>
                        <span className="text-[9px] text-slate-500">
                          {chat.lastMessage ? new Date(chat.lastMessage.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate italic">
                        {chat.lastMessage?.text || 'No messages'}
                      </p>
                      {chat.contact.status === 'pending' && (
                        <Badge className="bg-amber-500/10 text-amber-400 mt-1 text-[9px]">Unread</Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Middle chat window */}
            <Card className="bg-slate-950/60 border-slate-900 lg:col-span-2 h-[600px] flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-900 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    {activeChatContactId
                      ? conversations.find(c => c.contact.id === activeChatContactId)?.contact.name || 'Chat Conversation'
                      : 'Select a Chat'}
                  </CardTitle>
                  <CardDescription className="text-[10px]">Official WhatsApp Shared Inbox channel</CardDescription>
                </div>
                {activeChatContactId && (
                  <div className="flex gap-2">
                    <Select value={chatAssignee} onValueChange={setChatAssignee}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-xs h-7 py-0"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="me">Assigned to Me</SelectItem>
                        <SelectItem value="manager">Assigned to Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={chatStatus} onValueChange={v => { setChatStatus(v); }}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-xs h-7 py-0"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {!activeChatContactId ? (
                  <div className="text-center text-slate-500 py-24 flex flex-col items-center justify-center gap-2 h-full">
                    <MessageSquare className="w-12 h-12 text-slate-700" />
                    <p className="text-sm">Pick a contact thread from the active chats list to read/reply messages.</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <p className="text-slate-500 text-center py-24">No message logs recorded inside database.</p>
                ) : (
                  chatMessages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded p-3 text-xs ${m.direction === 'inbound' ? 'bg-slate-900 text-white border border-slate-800' : 'bg-[#FCA311]/15 text-white border border-[#FCA311]/20'}`}>
                        <p>{m.message_text}</p>
                        <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2 gap-4">
                          <span>{new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.direction === 'outbound' && (
                            <span className="font-semibold">{m.status.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              {activeChatContactId && (
                <div className="p-3 border-t border-slate-900 bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Input
                        type="checkbox"
                        checked={internalNote}
                        onChange={e => setInternalNote(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#FCA311] bg-slate-900 border-slate-800 rounded"
                      />
                      Internal Team Note
                    </span>
                    <span>Supports WhatsApp Meta Templates</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={internalNote ? 'Log internal note (invisible to attendee)...' : 'Type manual WhatsApp text message...'}
                      className="bg-slate-900 border-slate-800 text-white flex-1"
                      onKeyDown={e => { if (e.key === 'Enter') sendOutboundReply(); }}
                    />
                    <Button onClick={sendOutboundReply} className="bg-[#FCA311] text-black hover:bg-[#E09800]">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Right sidebar Meta webhook simulation */}
            <Card className="bg-slate-950/60 border-slate-900 lg:col-span-1 h-[600px] flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-900">
                <CardTitle className="text-xs flex items-center gap-1">
                  <Bot className="w-4 h-4 text-emerald-400 animate-pulse" /> Webhook Simulator
                </CardTitle>
                <CardDescription className="text-[10px]">Mock Meta callbacks for testing inbox integration</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {!activeChatContactId ? (
                  <p className="text-xs text-slate-500 text-center py-12">Select a chat first to use webhook simulation controls.</p>
                ) : (
                  <>
                    <div>
                      <Label className="text-[11px] text-slate-400">Simulate Inbound User Message</Label>
                      <div className="flex flex-col gap-2 mt-1">
                        <Input
                          value={simText}
                          onChange={e => setSimText(e.target.value)}
                          placeholder="Attendee typing..."
                          className="bg-slate-900 border-slate-800 text-xs h-8"
                        />
                        <Button size="xs" onClick={triggerSimulatedInbound} className="bg-emerald-500 text-black hover:bg-emerald-600 text-xs w-full py-1 h-7">
                          Inject Inbound Chat
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-4">
                      <Label className="text-[11px] text-slate-400">Simulate Receipt Callback</Label>
                      <p className="text-[9px] text-slate-500 mb-2">Simulate delivery or read updates for the outbound message logs.</p>
                      <div className="flex flex-col gap-1">
                        {chatMessages.filter(m => m.direction === 'outbound' && m.status !== 'read').slice(-3).map((m, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-slate-900 rounded text-[9px] mb-1">
                            <span className="truncate max-w-[80px] font-mono text-slate-400">{m.message_id}</span>
                            <div className="flex gap-1">
                              <Button
                                size="xs"
                                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 text-[9px] px-1.5 py-0 h-5"
                                onClick={async () => {
                                  await fetch(`/api/events/${eventId}/crm/whatsapp/messages`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contactId: activeChatContactId, messageId: m.message_id, status: 'delivered', simulate_direction: 'status' }),
                                  });
                                  openChatThread(activeChatContactId);
                                }}
                              >
                                Deliv
                              </Button>
                              <Button
                                size="xs"
                                className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 text-[9px] px-1.5 py-0 h-5"
                                onClick={async () => {
                                  await fetch(`/api/events/${eventId}/crm/whatsapp/messages`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contactId: activeChatContactId, messageId: m.message_id, status: 'read', simulate_direction: 'status' }),
                                  });
                                  openChatThread(activeChatContactId);
                                }}
                              >
                                Read
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==============================================
            TAB 4: AUTOMATED JOURNEYS / WORKFLOW BUILDER
            ============================================== */}
        <TabsContent value="workflows" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Automated Event Journeys</h2>
              <p className="text-xs text-slate-400">Trigger custom template WhatsApp notifications on specific registration and attendance actions.</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[#FCA311] text-black hover:bg-[#E09800]"><Plus className="w-4 h-4 mr-1.5" /> Build Journey</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Build Automated Workflow</DialogTitle>
                  <DialogDescription className="text-slate-400">Setup trigger conditions and action delay intervals.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Journey Name</Label>
                    <Input value={newWorkflow.name} onChange={e => setNewWorkflow({ ...newWorkflow, name: e.target.value })} placeholder="e.g. Registration confirmation" />
                  </div>
                  <div>
                    <Label>Workflow Trigger Event</Label>
                    <Select value={newWorkflow.triggerType} onValueChange={v => setNewWorkflow({ ...newWorkflow, triggerType: v })}>
                      <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="registration_complete">On Registration Complete</SelectItem>
                        <SelectItem value="checkin_complete">On Gate Check-In Complete</SelectItem>
                        <SelectItem value="certificate_ready">On Certificate Generated</SelectItem>
                        <SelectItem value="feedback_missing">Hours after feedback missing</SelectItem>
                        <SelectItem value="event_completed">On Event Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Template Name (from WhatsApp registry)</Label>
                    <Input value={newWorkflow.templateName} onChange={e => setNewWorkflow({ ...newWorkflow, templateName: e.target.value })} placeholder="e.g. event_registration_confirmed" />
                  </div>
                  <div>
                    <Label>Action Delay (Minutes - set 0 for immediate)</Label>
                    <Input type="number" value={newWorkflow.delayMinutes} onChange={e => setNewWorkflow({ ...newWorkflow, delayMinutes: parseInt(e.target.value) || 0 })} />
                  </div>
                  <Button onClick={handleCreateWorkflow} className="bg-[#FCA311] text-black hover:bg-[#E09800]">Create Journey</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Workflow list */}
            <div className="lg:col-span-2 space-y-4">
              {workflows.length === 0 ? (
                <Card className="bg-slate-950/60 border-slate-900 p-8 text-center text-slate-500">
                  No automated event journeys configured yet.
                </Card>
              ) : (
                workflows.map((w: any) => (
                  <Card key={w.id} className="bg-slate-950/60 border-slate-900">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> {w.name}
                          </CardTitle>
                          <CardDescription className="text-xs">Trigger: <span className="font-mono text-white text-[10px] bg-slate-900 px-1 py-0.5 rounded">{w.trigger_type}</span></CardDescription>
                        </div>
                        <Badge variant={w.is_active ? 'default' : 'secondary'}>{w.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center gap-4 bg-slate-900/40 p-3 rounded border border-slate-800/40 text-xs">
                        <div className="text-slate-400">Step 1 Action:</div>
                        <div className="flex-1 font-mono text-slate-300">
                          whatsapp_template: <span className="text-[#FCA311]">{w.actions?.[0]?.template_name}</span> 
                          {w.actions?.[0]?.delay_minutes > 0 ? ` (Delayed ${w.actions?.[0]?.delay_minutes}m)` : ' (Immediate)'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Run logs */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader>
                <CardTitle className="text-md">Workflow Execution Log</CardTitle>
                <CardDescription>Tracks automation runs and delivery steps.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {workflowRuns.length === 0 ? (
                  <p className="text-slate-600 text-center py-12 text-xs">No runs recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-900">
                    {workflowRuns.map((r: any) => (
                      <div key={r.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-900/10">
                        <div>
                          <span className="font-semibold text-white">{r.contact?.name || 'Contact'}</span>
                          <div className="text-[10px] text-slate-500">Template: {r.execution_log?.template_name}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={r.status === 'completed' ? 'border-emerald-500/35 text-emerald-400 bg-emerald-500/5' : 'border-slate-800 text-slate-400 bg-slate-900'}>
                            {r.status}
                          </Badge>
                          <div className="text-[9px] text-slate-500 mt-1">{new Date(r.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==============================================
            TAB 5: BROADCAST CAMPAIGN SYSTEM
            ============================================== */}
        <TabsContent value="campaigns" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Campaign form */}
            <Card className="bg-slate-950/60 border-slate-900 lg:col-span-1">
              <CardHeader>
                <CardTitle>Create Broadcast Campaign</CardTitle>
                <CardDescription>Dispatch bulk template messages to targeted segments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Title</Label>
                  <Input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="e.g. Schedule Updates Day 2" />
                </div>
                <div>
                  <Label>WhatsApp Template</Label>
                  <Select value={newCampaign.templateId} onValueChange={v => setNewCampaign({ ...newCampaign, templateId: v })}>
                    <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Select a Template" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Segments</Label>
                  <Select value={newCampaign.targetSegment} onValueChange={v => setNewCampaign({ ...newCampaign, targetSegment: v })}>
                    <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="all">All Attendees</SelectItem>
                      <SelectItem value="checked_in">Checked-In Attendees</SelectItem>
                      <SelectItem value="absent">Absent Attendees</SelectItem>
                      <SelectItem value="volunteers">Event Volunteers</SelectItem>
                      <SelectItem value="speakers">Speakers</SelectItem>
                      <SelectItem value="sponsors">Sponsors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-slate-900/60 p-3 rounded border border-slate-800/40 space-y-2 text-xs">
                  <div className="font-bold text-slate-300">Variables mapping:</div>
                  <div className="text-[10px] text-slate-500">Maps index values to contact parameters.</div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="font-mono">{'{{1}}'}</Badge>
                    <span className="text-slate-400">Attendee Name (automatically resolved)</span>
                  </div>
                </div>
                <Button onClick={handleLaunchCampaign} className="bg-[#FCA311] text-black hover:bg-[#E09800] w-full">Launch Broadcast</Button>
              </CardContent>
            </Card>

            {/* Broadcast dispatches list */}
            <Card className="bg-slate-950/60 border-slate-900 lg:col-span-2">
              <CardHeader>
                <CardTitle>Broadcast Campaign History</CardTitle>
                <CardDescription>Dispatched bulk messages and status analytics</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {campaigns.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">No campaigns launched yet.</p>
                ) : (
                  <Table>
                    <TableHeader className="border-slate-800">
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Name</TableHead>
                        <TableHead className="text-slate-400">Segment</TableHead>
                        <TableHead className="text-slate-400">Sent / Deliv / Read</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map(c => (
                        <TableRow key={c.id} className="border-slate-900 hover:bg-slate-900/20">
                          <TableCell className="font-semibold text-white">
                            {c.name}
                            <div className="text-xs text-slate-500">Template: {c.template?.name}</div>
                          </TableCell>
                          <TableCell><Badge className="bg-slate-900 text-slate-400 border-slate-800">{c.target_segment}</Badge></TableCell>
                          <TableCell className="text-xs">
                            <span className="text-white font-bold">{c.sent_count}</span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-emerald-400">{c.delivered_count}</span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-blue-400">{c.read_count}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'sending' ? 'outline' : 'default'} className={c.status === 'sending' ? 'border-[#FCA311] text-[#FCA311]' : ''}>
                              {c.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==============================================
            TAB 6: VOLUNTEER & STAFF CRM PLANNER
            ============================================== */}
        <TabsContent value="volunteers" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Volunteer CRM Assignments */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#FCA311]" /> Volunteer Planners & Status
                </CardTitle>
                <CardDescription>Track assignments, shifts, and WhatsApp check-in status notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-400">
                  Volunteers automatically link to CRM contact profiles. Manage their tasks, training status, and reporting alerts.
                </p>
                <div className="space-y-2">
                  {[
                    { name: 'Alice Smith', task: 'Registration Desk Morning Shift', status: 'Checked In', phone: '+919911223344', training: 'Completed' },
                    { name: 'Bob Johnson', task: 'Hall A Speaker Usher', status: 'Assigned', phone: '+919922334455', training: 'Pending' },
                  ].map((v, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 rounded border border-slate-800/40 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{v.name}</div>
                        <div className="text-slate-400 mt-1">Task: {v.task}</div>
                        <div className="text-slate-500 mt-0.5">Training: {v.training}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={v.status === 'Checked In' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-slate-800 text-slate-400 bg-slate-900'}>
                          {v.status}
                        </Badge>
                        <div className="text-[10px] text-slate-500 mt-1">{v.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Staff Tasks CRM coordinator */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" /> Staff Coordinator Dashboard
                </CardTitle>
                <CardDescription>Track assigned tasks, escalations, and automated WhatsApp updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    { task: 'Prepare certificate templates', staff: 'David Miller', status: 'Ongoing', deadline: 'Today 18:00', escalation: 'None' },
                    { task: 'Verify payment gateway creds', staff: 'Sarah Connor', status: 'Completed', deadline: 'Yesterday', escalation: 'None' },
                    { task: 'Setup main entrance gate wifi', staff: 'Kyle Reese', status: 'Escalated', deadline: 'Overdue 2h', escalation: 'Needs backup wifi router' },
                  ].map((s, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 rounded border border-slate-800/40 text-xs flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white">{s.task}</div>
                        <div className="text-slate-400 mt-1">Staff: {s.staff}</div>
                        {s.escalation !== 'None' && (
                          <div className="text-red-400 flex items-center gap-1 mt-1 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Escalation: {s.escalation}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={s.status === 'Completed' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : s.status === 'Escalated' ? 'border-red-500/40 text-red-400 bg-red-500/5 animate-pulse' : 'border-slate-800 text-slate-400 bg-slate-900'}>
                          {s.status}
                        </Badge>
                        <div className="text-[10px] text-slate-500 mt-1">{s.deadline}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==============================================
            TAB 7: SPEAKERS & SPONSORS CRM
            ============================================== */}
        <TabsContent value="sponsors" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Speaker profile lists */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#FCA311]" /> Speakers Dossiers
                </CardTitle>
                <CardDescription>Manage speakers bio details, travel logs, and ratings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    { name: 'Dr. Jane Foster', topic: 'Keynote: Astro-Physics in 2026', travel: 'Flights booked, hotel check-in done', rating: '4.8' },
                    { name: 'Bruce Banner', topic: 'Workshop: Gamma Rays & Safety', travel: 'Self-driving, no hotel needed', rating: '4.9' },
                  ].map((sp, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 rounded border border-slate-800/40 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{sp.name}</div>
                        <div className="text-slate-400 mt-1">Topic: {sp.topic}</div>
                        <div className="text-slate-500 mt-0.5">Travel: {sp.travel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#FCA311] flex items-center gap-1 font-bold">
                          <Star className="w-3.5 h-3.5 fill-[#FCA311]" /> {sp.rating}
                        </div>
                        <span className="text-[10px] text-slate-500">Rating</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sponsor details */}
            <Card className="bg-slate-950/60 border-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-indigo-400" /> Sponsors Tracker
                </CardTitle>
                <CardDescription>Track booth allocations, brand assets, and ROI interactions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    { name: 'Stark Industries', tier: 'Platinum', booth: 'A1 Main Hall', asset: 'Assets verified', paid: '₹2,50,000' },
                    { name: 'Oscorp Corp', tier: 'Gold', booth: 'B3 Entrance', asset: 'Pending banner upload', paid: '₹1,50,000' },
                  ].map((s, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 rounded border border-slate-800/40 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-slate-400 mt-1">Booth: {s.booth}</div>
                        <div className="text-slate-500 mt-0.5">Assets: {s.asset}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{s.paid}</div>
                        <Badge className="bg-slate-900 text-slate-400 border-slate-800 mt-1">{s.tier}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

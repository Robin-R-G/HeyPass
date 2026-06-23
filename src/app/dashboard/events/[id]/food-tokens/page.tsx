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

interface TokenType { id: string; name: string; meal_time: string; valid_from: string; valid_to: string; max_uses_per_person: number; total_quantity: number; used_quantity: number; is_active: boolean; }
interface TokenStat { token_type_id: string; name: string; meal_time: string; total_issued: number; total_used: number; remaining: number; }

export default function FoodTokensPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [tokenTypes, setTokenTypes] = useState<TokenType[]>([]);
  const [stats, setStats] = useState<TokenStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState({ name: "", meal_time: "lunch", description: "", valid_from: "", valid_to: "", max_uses_per_person: 1, total_quantity: 100 });
  const [validateCode, setValidateCode] = useState("");
  const [validateResult, setValidateResult] = useState<{ success: boolean; message: string; data?: unknown } | null>(null);
  const [validating, setValidating] = useState(false);
  const [generateTypeId, setGenerateTypeId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ success: boolean; count: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/food-tokens`).then(r => r.json()),
      fetch(`/api/events/${eventId}/food-tokens/stats`).then(r => r.json()),
    ]).then(([tData, sData]) => {
      setTokenTypes(tData.tokenTypes || tData.token_types || []);
      setStats(sData.stats || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [eventId]);

  const createType = async () => {
    await fetch(`/api/events/${eventId}/food-tokens`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newType) });
    setCreateOpen(false);
    const tData = await fetch(`/api/events/${eventId}/food-tokens`).then(r => r.json());
    setTokenTypes(tData.tokenTypes || tData.token_types || []);
  };

  const generateTokens = async () => {
    if (!generateTypeId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/food-tokens/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_type_id: generateTypeId }),
      });
      const data = await res.json();
      setGenerateResult({ success: res.ok, count: data.generated || data.count || 0 });
      const sData = await fetch(`/api/events/${eventId}/food-tokens/stats`).then(r => r.json());
      setStats(sData.stats || []);
    } catch {
      setGenerateResult({ success: false, count: 0 });
    }
    setGenerating(false);
  };

  const validateToken = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/food-tokens/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token_code: validateCode }) });
      const data = await res.json();
      setValidateResult({ success: res.ok, message: data.message || (res.ok ? "Token validated" : "Validation failed"), data });
    } catch { setValidateResult({ success: false, message: "Network error" }); }
    setValidating(false);
  };

  const mealColor = (m: string) => {
    switch (m) { case "breakfast": return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]"; case "lunch": return "bg-[rgba(16,185,129,0.15)] text-[#10b981]"; case "dinner": return "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]"; default: return "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]"; }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#011C40', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="p-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#9cb8c4', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#9cb8c4', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#5a7a8a' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Food Tokens</span>
      </nav>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Food Tokens</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${eventId}/dashboard`}><Button variant="outline" size="sm">Dashboard</Button></Link>
          <Link href={`/dashboard/events/${eventId}/food-tokens`}><Button size="sm">Food Tokens</Button></Link>
        </div>
      </div>
      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Token Types</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Token Types ({tokenTypes.length})</CardTitle>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild><Button>Create Type</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Token Type</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Name</Label><Input value={newType.name} onChange={e => setNewType({ ...newType, name: e.target.value })} placeholder="e.g. Lunch Day 1" /></div>
                    <div><Label>Meal Time</Label>
                      <Select value={newType.meal_time} onValueChange={v => setNewType({ ...newType, meal_time: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem><SelectItem value="lunch">Lunch</SelectItem><SelectItem value="dinner">Dinner</SelectItem><SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Valid From</Label><Input type="datetime-local" value={newType.valid_from} onChange={e => setNewType({ ...newType, valid_from: e.target.value })} /></div>
                      <div><Label>Valid To</Label><Input type="datetime-local" value={newType.valid_to} onChange={e => setNewType({ ...newType, valid_to: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Max Uses/Person</Label><Input type="number" value={newType.max_uses_per_person} onChange={e => setNewType({ ...newType, max_uses_per_person: parseInt(e.target.value) || 1 })} /></div>
                      <div><Label>Total Quantity</Label><Input type="number" value={newType.total_quantity} onChange={e => setNewType({ ...newType, total_quantity: parseInt(e.target.value) || 100 })} /></div>
                    </div>
                    <Button onClick={createType}>Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Meal</TableHead><TableHead>Valid Window</TableHead><TableHead>Used/Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tokenTypes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge className={mealColor(t.meal_time)}>{t.meal_time}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(t.valid_from).toLocaleDateString()} - {new Date(t.valid_to).toLocaleDateString()}</TableCell>
                      <TableCell>{t.used_quantity}/{t.total_quantity}</TableCell>
                      <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Generate Tokens</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#5a7a8a]">Select a token type to bulk-generate food tokens for all registrations.</p>
              <div><Label>Token Type</Label>
                <Select value={generateTypeId} onValueChange={setGenerateTypeId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select token type..." /></SelectTrigger>
                  <SelectContent>
                    {tokenTypes.filter(t => t.is_active).map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.meal_time})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateTokens} disabled={!generateTypeId || generating}>
                {generating ? "Generating..." : "Generate Tokens"}
              </Button>
              {generateResult && (
                <div className={`border-[rgba(167,235,242,0.12)] rounded-lg p-3 ${generateResult.success ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]"}`}>
                  <p className={`font-medium text-sm ${generateResult.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                    {generateResult.success ? `Generated ${generateResult.count} tokens successfully` : "Generation failed"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validate" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Validate Food Token</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input placeholder="Enter token code..." value={validateCode} onChange={e => setValidateCode(e.target.value)} className="flex-1" />
                <Button onClick={validateToken} disabled={validating || !validateCode}>{validating ? "Validating..." : "Validate"}</Button>
              </div>
              {validateResult && (
                <div className={`border-[rgba(167,235,242,0.12)] rounded-lg p-4 ${validateResult.success ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]"}`}>
                  <p className={`font-medium ${validateResult.success ? "text-[#10b981]" : "text-[#ef4444]"}`}>{validateResult.success ? "Valid" : "Invalid"}</p>
                  <p className="text-sm mt-1">{validateResult.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Issued", value: stats.reduce((a, s) => a + s.total_issued, 0) },
              { label: "Total Used", value: stats.reduce((a, s) => a + s.total_used, 0) },
              { label: "Active", value: stats.reduce((a, s) => a + (s.total_issued - s.total_used), 0) },
              { label: "Token Types", value: tokenTypes.length },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{k.value}</p><p className="text-sm text-[#5a7a8a]">{k.label}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>By Meal Type</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Meal</TableHead><TableHead>Issued</TableHead><TableHead>Used</TableHead><TableHead>Remaining</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stats.map(s => (
                    <TableRow key={s.token_type_id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge className={mealColor(s.meal_time)}>{s.meal_time}</Badge></TableCell>
                      <TableCell>{s.total_issued}</TableCell><TableCell>{s.total_used}</TableCell><TableCell>{s.remaining}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

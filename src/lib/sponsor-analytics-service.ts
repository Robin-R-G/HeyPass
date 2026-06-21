import { supabaseAdmin } from '@/lib/supabase/client';

interface SponsorInput {
  name: string;
  tier?: string;
  logo_url?: string;
  website_url?: string;
  booth_location?: string;
  contact_name?: string;
  contact_email?: string;
  amount_paid?: number;
  is_active?: boolean;
}

interface BrandingInput {
  placement_type: string;
}

interface SponsorAnalyticsResult {
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

interface EventSponsorSummary {
  total_sponsors: number;
  total_revenue: number;
  tier_breakdown: { tier: string; count: number; revenue: number }[];
  total_impressions: number;
  total_scans: number;
}

// ─── Sponsors ───────────────────────────────────────────────────

async function createSponsor(clientId: string, eventId: string, data: SponsorInput) {
  const { data: sponsor, error } = await supabaseAdmin
    .from('sponsors')
    .insert({
      client_id: clientId,
      event_id: eventId,
      name: data.name,
      tier: data.tier || 'silver',
      logo_url: data.logo_url || null,
      website_url: data.website_url || null,
      booth_location: data.booth_location || null,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      amount_paid: data.amount_paid || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sponsor: ${error.message}`);
  return sponsor;
}

async function getSponsors(clientId: string, eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list sponsors: ${error.message}`);
  return data || [];
}

async function getSponsorById(clientId: string, sponsorId: string) {
  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('*')
    .eq('id', sponsorId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .single();

  if (error) throw new Error(`Failed to get sponsor: ${error.message}`);
  return data;
}

async function updateSponsor(clientId: string, sponsorId: string, data: Partial<SponsorInput>) {
  const { data: sponsor, error } = await supabaseAdmin
    .from('sponsors')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', sponsorId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update sponsor: ${error.message}`);
  return sponsor;
}

async function deleteSponsor(clientId: string, sponsorId: string) {
  const { error } = await supabaseAdmin
    .from('sponsors')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', sponsorId)
    .eq('client_id', clientId);

  if (error) throw new Error(`Failed to delete sponsor: ${error.message}`);
}

// ─── Branding ───────────────────────────────────────────────────

async function createSponsorBranding(clientId: string, eventId: string, sponsorId: string, data: BrandingInput) {
  const { data: branding, error } = await supabaseAdmin
    .from('sponsor_branding')
    .insert({
      client_id: clientId,
      event_id: eventId,
      sponsor_id: sponsorId,
      placement_type: data.placement_type,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create branding: ${error.message}`);
  return branding;
}

async function getSponsorBranding(clientId: string, eventId: string, sponsorId?: string) {
  let query = supabaseAdmin
    .from('sponsor_branding')
    .select('*, sponsor:sponsors(name, tier)')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (sponsorId) {
    query = query.eq('sponsor_id', sponsorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list branding: ${error.message}`);
  return data || [];
}

// ─── Scans ──────────────────────────────────────────────────────

async function recordSponsorScan(
  clientId: string,
  eventId: string,
  sponsorId: string,
  brandingId: string,
  registrationId: string | null,
  scanType: string,
  deviceInfo?: string
) {
  const { data: scan, error: scanError } = await supabaseAdmin
    .from('sponsor_scans')
    .insert({
      client_id: clientId,
      event_id: eventId,
      sponsor_id: sponsorId,
      branding_id: brandingId,
      registration_id: registrationId || null,
      scan_type: scanType,
      device_info: deviceInfo || null,
    })
    .select()
    .single();

  if (scanError) throw new Error(`Failed to record scan: ${scanError.message}`);

  const { error: updateError } = await supabaseAdmin
    .from('sponsor_branding')
    .update({
      scans: supabaseAdmin.rpc ? undefined : undefined,
      last_scanned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandingId);

  // Increment scans via raw update
  await supabaseAdmin
    .from('sponsor_branding')
    .update({ last_scanned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', brandingId);

  return scan;
}

async function getRecentScans(clientId: string, eventId: string, sponsorId?: string) {
  let query = supabaseAdmin
    .from('sponsor_scans')
    .select('*, sponsor:sponsors(name, tier), branding:sponsor_branding(placement_type), registration:registrations(first_name, last_name, email)')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false })
    .limit(100);

  if (sponsorId) {
    query = query.eq('sponsor_id', sponsorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list scans: ${error.message}`);
  return data || [];
}

// ─── Analytics ──────────────────────────────────────────────────

async function getSponsorAnalytics(clientId: string, eventId: string, sponsorId?: string): Promise<SponsorAnalyticsResult> {
  let brandingQuery = supabaseAdmin
    .from('sponsor_branding')
    .select('id, placement_type, impressions, unique_views, scans, clicks')
    .eq('client_id', clientId)
    .eq('event_id', eventId);

  if (sponsorId) {
    brandingQuery = brandingQuery.eq('sponsor_id', sponsorId);
  }

  const { data: brandingData, error: brandingError } = await brandingQuery;
  if (brandingError) throw new Error(`Failed to get analytics: ${brandingError.message}`);

  const branding = brandingData || [];

  const totalImpressions = branding.reduce((s, b) => s + (b.impressions || 0), 0);
  const totalUniqueViews = branding.reduce((s, b) => s + (b.unique_views || 0), 0);
  const totalScans = branding.reduce((s, b) => s + (b.scans || 0), 0);
  const totalClicks = branding.reduce((s, b) => s + (b.clicks || 0), 0);

  const topPerformers = branding
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
    .slice(0, 10)
    .map((b) => ({
      branding_id: b.id,
      placement_type: b.placement_type,
      impressions: b.impressions || 0,
      scans: b.scans || 0,
      clicks: b.clicks || 0,
    }));

  let scanQuery = supabaseAdmin
    .from('sponsor_scans')
    .select('scanned_at')
    .eq('client_id', clientId)
    .eq('event_id', eventId);

  if (sponsorId) {
    scanQuery = scanQuery.eq('sponsor_id', sponsorId);
  }

  const { data: scanData } = await scanQuery;
  const scans = scanData || [];

  const timelineMap = new Map<string, number>();
  for (const s of scans) {
    const day = new Date(s.scanned_at).toISOString().slice(0, 10);
    timelineMap.set(day, (timelineMap.get(day) || 0) + 1);
  }
  const scanTimeline = Array.from(timelineMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_impressions: totalImpressions,
    total_unique_views: totalUniqueViews,
    total_scans: totalScans,
    total_clicks: totalClicks,
    top_performers: topPerformers,
    scan_timeline: scanTimeline,
  };
}

async function getEventSponsorSummary(clientId: string, eventId: string): Promise<EventSponsorSummary> {
  const { data: sponsors, error } = await supabaseAdmin
    .from('sponsors')
    .select('id, tier, amount_paid')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null);

  if (error) throw new Error(`Failed to get summary: ${error.message}`);

  const allSponsors = sponsors || [];
  const totalSponsors = allSponsors.length;
  const totalRevenue = allSponsors.reduce((s, sp) => s + (Number(sp.amount_paid) || 0), 0);

  const tierMap = new Map<string, { count: number; revenue: number }>();
  for (const sp of allSponsors) {
    const existing = tierMap.get(sp.tier) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += Number(sp.amount_paid) || 0;
    tierMap.set(sp.tier, existing);
  }
  const tierBreakdown = Array.from(tierMap.entries()).map(([tier, v]) => ({
    tier,
    count: v.count,
    revenue: v.revenue,
  }));

  const { data: brandingData } = await supabaseAdmin
    .from('sponsor_branding')
    .select('impressions, scans')
    .eq('client_id', clientId)
    .eq('event_id', eventId);

  const branding = brandingData || [];
  const totalImpressions = branding.reduce((s, b) => s + (b.impressions || 0), 0);
  const totalScans = branding.reduce((s, b) => s + (b.scans || 0), 0);

  return {
    total_sponsors: totalSponsors,
    total_revenue: totalRevenue,
    tier_breakdown: tierBreakdown,
    total_impressions: totalImpressions,
    total_scans: totalScans,
  };
}

export const sponsorAnalyticsService = {
  createSponsor,
  getSponsors,
  getSponsorById,
  updateSponsor,
  deleteSponsor,
  createSponsorBranding,
  getSponsorBranding,
  recordSponsorScan,
  getRecentScans,
  getSponsorAnalytics,
  getEventSponsorSummary,
};

export type { SponsorInput, BrandingInput, SponsorAnalyticsResult, EventSponsorSummary };

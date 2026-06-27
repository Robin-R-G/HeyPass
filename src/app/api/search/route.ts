import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export const GET = withAuth(async (req, auth) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '10');

  if (!q.trim()) {
    return successResponse([]);
  }

  const clientId = auth.clientId;
  if (!clientId) {
    return errorResponse('No client context', 403);
  }

  const pattern = `%${q}%`;
  const results: Array<{
    id: string;
    title: string;
    subtitle?: string;
    type: string;
    href: string;
    icon: string;
  }> = [];

  // Search events
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, status, start_date')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(5);

  if (events) {
    for (const e of events) {
      results.push({
        id: e.id,
        title: e.title,
        subtitle: e.start_date ? new Date(e.start_date).toLocaleDateString() : e.status,
        type: 'event',
        href: `/dashboard/events/${e.id}/dashboard`,
        icon: 'calendar',
      });
    }
  }

  // Search registrations / participants
  const { data: registrations } = await supabaseAdmin
    .from('registrations')
    .select('id, first_name, last_name, email, event_id, events!inner(title)')
    .eq('client_id', clientId)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(5);

  if (registrations) {
    for (const r of registrations) {
      const ev = r.events as unknown as { title: string } | null;
      results.push({
        id: r.id,
        title: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Unknown',
        subtitle: ev?.title || '',
        type: 'participant',
        href: `/dashboard/events/${r.event_id}/dashboard`,
        icon: 'users',
      });
    }
  }

  // Search certificates
  const { data: certificates } = await supabaseAdmin
    .from('certificates')
    .select('id, certificate_number, recipient_name, event_id, events!inner(title)')
    .eq('client_id', clientId)
    .or(`certificate_number.ilike.${pattern},recipient_name.ilike.${pattern}`)
    .limit(3);

  if (certificates) {
    for (const c of certificates) {
      const ev = c.events as unknown as { title: string } | null;
      results.push({
        id: c.id,
        title: c.recipient_name || c.certificate_number || 'Certificate',
        subtitle: ev?.title || '',
        type: 'certificate',
        href: `/dashboard/events/${c.event_id}/certificates`,
        icon: 'award',
      });
    }
  }

  // Search team members
  const { data: members } = await supabaseAdmin
    .from('client_memberships')
    .select('id, user_id, users!inner(first_name, last_name, email)')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .limit(3);

  if (members) {
    for (const m of members) {
      const u = m.users as unknown as { first_name?: string; last_name?: string; email?: string } | null;
      if (!u) continue;
      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      const searchTarget = `${name} ${u.email || ''}`.toLowerCase();
      if (!searchTarget.includes(q.toLowerCase())) continue;
      results.push({
        id: m.id,
        title: name || u.email || 'Member',
        subtitle: u.email || '',
        type: 'team',
        href: '/dashboard/settings/team',
        icon: 'user',
      });
    }
  }

  // Sort: events first, then alphabetically
  results.sort((a, b) => {
    const typeOrder: Record<string, number> = { event: 0, participant: 1, team: 2, certificate: 3 };
    const diff = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });

  return successResponse(results.slice(0, limit));
});

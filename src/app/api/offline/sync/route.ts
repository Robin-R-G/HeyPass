import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';

// POST /api/offline/sync — Sync offline scans
export async function POST(req: NextRequest) {
  return withAuth(req, async (req, userId, clientId) => {
    try {
      const { scans } = await req.json();

      if (!Array.isArray(scans) || scans.length === 0) {
        return NextResponse.json({ success: false, error: 'scans array is required' }, { status: 400 });
      }

      if (scans.length > 100) {
        return NextResponse.json({ success: false, error: 'Maximum 100 scans per sync' }, { status: 400 });
      }

      const results: { sync_id: string; status: string; error?: string }[] = [];

      for (const scan of scans) {
        const { scan_type, ticket_id, event_id, registration_id, station_id, scanned_at, qr_data, sync_id } = scan;

        // Check if this sync_id was already processed (idempotent)
        if (sync_id) {
          const { data: existing } = await supabaseAdmin
            .from('offline_scans')
            .select('id')
            .eq('sync_id', sync_id)
            .eq('synced', true)
            .limit(1)
            .single();

          if (existing) {
            results.push({ sync_id, status: 'already_synced' });
            continue;
          }
        }

        // Conflict resolution: check if ticket already has this scan type
        if (scan_type === 'check_in') {
          const { data: existingCheckin } = await supabaseAdmin
            .from('check_ins')
            .select('id')
            .eq('ticket_id', ticket_id)
            .eq('event_id', event_id)
            .eq('scan_type', 'check_in')
            .limit(1)
            .single();

          if (existingCheckin) {
            // Mark as synced with conflict resolution
            if (sync_id) {
              await supabaseAdmin
                .from('offline_scans')
                .update({ synced: true, synced_at: new Date().toISOString(), conflict_resolution: 'server_wins' })
                .eq('sync_id', sync_id);
            }
            results.push({ sync_id, status: 'conflict_server_wins' });
            continue;
          }
        }

        // Insert the scan
        const { error } = await supabaseAdmin
          .from('check_ins')
          .insert({
            client_id: clientId,
            event_id,
            registration_id,
            ticket_id,
            staff_id: userId,
            station_id: station_id || null,
            scan_type,
            scanned_at,
            qr_data: qr_data || null,
            is_offline: true,
            sync_id: sync_id || null,
          });

        if (error) {
          results.push({ sync_id, status: 'error', error: error.message });
          continue;
        }

        // Update ticket status
        if (scan_type === 'check_in') {
          await supabaseAdmin
            .from('tickets')
            .update({ status: 'used', checked_in_at: scanned_at })
            .eq('id', ticket_id);
        }

        // Mark offline scan as synced
        if (sync_id) {
          await supabaseAdmin
            .from('offline_scans')
            .update({ synced: true, synced_at: new Date().toISOString(), conflict_resolution: 'local_wins' })
            .eq('sync_id', sync_id);
        }

        results.push({ sync_id, status: 'synced' });
      }

      return NextResponse.json({ success: true, data: results });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync offline scans';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

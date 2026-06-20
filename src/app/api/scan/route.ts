import { NextRequest, NextResponse } from 'next/server';
import { scanValidation } from '@/lib/qr-scanner';
import { withAuth } from '@/lib/route-guard';
import { checkRateLimit } from '@/lib/cache';

// POST /api/scan — Validate QR and process check-in/check-out
export async function POST(req: NextRequest) {
  return withAuth(req, async (req, user) => {
    try {
      const body = await req.json();
      const { qr_string, event_id, station_id, scan_type } = body;

      if (!qr_string || !event_id) {
        return NextResponse.json(
          { success: false, error: 'qr_string and event_id are required' },
          { status: 400 }
        );
      }

      // Global rate limit: 100 scans per user per minute
      const { allowed } = await checkRateLimit(`scan:user:${user.id}`, 100, 60);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many scan attempts. Please slow down.' },
          { status: 429 }
        );
      }

      const result = await scanValidation.validate({
        qr_string,
        event_id,
        client_id: user.client_id!,
        station_id: station_id || undefined,
        staff_id: user.id,
        scan_type: scan_type || 'check_in',
        ip_address: req.headers.get('x-forwarded-for') || undefined,
        device_id: req.headers.get('x-device-id') || undefined,
      });

      return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Scan validation failed';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

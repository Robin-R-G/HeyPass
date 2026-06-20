import { NextRequest, NextResponse } from 'next/server';
import { manualCertificateService } from '@/lib/manual-certificates';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/certificates — List manual certificates
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const certs = await manualCertificateService.list(user.client_id!, eventId);
      return NextResponse.json({ success: true, data: certs });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list certificates';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

// POST /api/events/[id]/certificates — Create manual certificate
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const body = await req.json();
      const { name, email, template_id, type_id, event_title, event_date, custom_fields } = body;

      if (!name || !template_id || !type_id) {
        return NextResponse.json(
          { success: false, error: 'name, template_id, type_id are required' },
          { status: 400 }
        );
      }

      const cert = await manualCertificateService.create(user.client_id!, {
        event_id: eventId,
        template_id,
        type_id,
        name,
        email,
        event_title,
        event_date,
        custom_fields,
      });

      return NextResponse.json({ success: true, data: cert }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create certificate';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

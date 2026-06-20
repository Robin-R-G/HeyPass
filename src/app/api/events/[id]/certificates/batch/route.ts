import { NextRequest, NextResponse } from 'next/server';
import { manualCertificateService } from '@/lib/manual-certificates';
import { withAuth } from '@/lib/route-guard';

// POST /api/events/[id]/certificates/batch — Batch create manual certificates
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const { entries } = await req.json();

      if (!Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json(
          { success: false, error: 'entries array is required' },
          { status: 400 }
        );
      }

      if (entries.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 certificates per batch' },
          { status: 400 }
        );
      }

      // Validate each entry
      for (const entry of entries) {
        if (!entry.name || !entry.template_id || !entry.type_id) {
          return NextResponse.json(
            { success: false, error: 'Each entry requires name, template_id, type_id' },
            { status: 400 }
          );
        }
      }

      const certs = await manualCertificateService.batchCreate(user.client_id!, eventId, entries);
      return NextResponse.json({ success: true, data: certs }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to batch create certificates';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

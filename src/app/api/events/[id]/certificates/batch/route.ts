import { NextRequest, NextResponse } from 'next/server';
import { manualCertificateService } from '@/lib/manual-certificates';
import { withAuth } from '@/lib/route-guard';
import { addCertificateJob } from '@/lib/queue';
import { supabaseAdmin } from '@/lib/supabase/client';

// POST /api/events/[id]/certificates/batch — Batch create manual certificates
// For >10 certs, queues to BullMQ worker for async processing
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, _userId, clientId) => {
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

      // For small batches (<=10), process synchronously
      if (entries.length <= 10) {
        const certs = await manualCertificateService.batchCreate(clientId, eventId, entries);
        return NextResponse.json({ success: true, data: certs }, { status: 201 });
      }

      // For larger batches, create DB records first then queue PDF generation
      const certs = await manualCertificateService.batchCreate(clientId, eventId, entries);

      // Queue PDF generation to BullMQ worker
      const certIds = certs.map((c) => c.id);
      await addCertificateJob({
        client_id: clientId,
        event_id: eventId,
        certificate_type: entries[0].type_id,
        template_id: entries[0].template_id,
        certificate_ids: certIds,
        total: certIds.length,
      });

      return NextResponse.json({
        success: true,
        data: certs,
        queued: true,
        message: `${certs.length} certificates created. PDF generation queued for background processing.`,
      }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to batch create certificates';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

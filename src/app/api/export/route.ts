import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { downloadService } from '@/lib/download-service';
import { z } from 'zod';

const exportSchema = z.object({
  event_id: z.string().uuid(),
  certificate_type_id: z.string().uuid().optional(),
  max_size: z.number().min(1).max(1000).optional(),
});

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = exportSchema.parse(body);
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

      const result = await downloadService.exportZIP(
        clientId,
        parsed.event_id,
        ip,
        { certificate_type_id: parsed.certificate_type_id, max_size: parsed.max_size }
      );

      return NextResponse.json({ export: result }, {
        status: result.status === 'completed' ? 200 : 202,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const jobId = searchParams.get('job_id');

      if (!jobId) {
        return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
      }

      const result = await downloadService.getJobStatus(jobId);
      return NextResponse.json({ export: result });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

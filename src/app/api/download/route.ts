import { NextRequest, NextResponse } from 'next/server';
import { downloadService } from '@/lib/download-service';
import { z } from 'zod';

const downloadSchema = z.object({
  certificate_id: z.string().uuid(),
  type: z.enum(['pdf', 'png']).default('pdf'),
});

const zipSchema = z.object({
  event_id: z.string().uuid(),
  certificate_type_id: z.string().uuid().optional(),
  max_size: z.number().min(1).max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Single file download
    if (body.certificate_id) {
      const parsed = downloadSchema.parse(body);
      const result = parsed.type === 'png'
        ? await downloadService.downloadPNG(parsed.certificate_id, ip, userAgent)
        : await downloadService.downloadPDF(parsed.certificate_id, ip, userAgent);

      return NextResponse.json({ download: result });
    }

    // ZIP export
    if (body.event_id) {
      const parsed = zipSchema.parse(body);
      const result = await downloadService.exportZIP(
        '', // clientId will be extracted from auth
        parsed.event_id,
        ip,
        { certificate_type_id: parsed.certificate_type_id, max_size: parsed.max_size }
      );
      return NextResponse.json({ export: result });
    }

    return NextResponse.json({ error: 'certificate_id or event_id is required' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

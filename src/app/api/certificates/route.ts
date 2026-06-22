import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { certificateService } from '@/lib/certificate-service';
import { z } from 'zod';

const generateSchema = z.object({
  event_id: z.string().uuid(),
  template_id: z.string().uuid(),
  type_id: z.string().uuid(),
  registration_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  event_title: z.string().optional(),
  event_date: z.string().optional(),
  custom_fields: z.record(z.string()).optional(),
});

const batchSchema = z.object({
  event_id: z.string().uuid(),
  certificates: z.array(z.object({
    template_id: z.string().uuid(),
    type_id: z.string().uuid(),
    registration_id: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    email: z.string().email().optional(),
    event_title: z.string().optional(),
    event_date: z.string().optional(),
    custom_fields: z.record(z.string()).optional(),
  })).max(100),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id');

      if (!eventId) {
        return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
      }

      const certificates = await certificateService.list(clientId, eventId);
      return NextResponse.json({ certificates });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();

      // Check if batch
      if (Array.isArray(body.certificates)) {
        const parsed = batchSchema.parse(body);
        const result = await certificateService.batchGenerate(clientId, parsed.event_id, parsed.certificates.map(c => ({ ...c, event_id: parsed.event_id })) as any);
        return NextResponse.json(result, {
          status: result.errors.length > 0 ? 207 : 201,
        });
      }

      // Single certificate
      const parsed = generateSchema.parse(body) as any;
      const cert = await certificateService.generate(clientId, parsed);
      return NextResponse.json({ certificate: cert }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

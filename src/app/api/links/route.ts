import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { registrationLinkService } from '@/lib/registration-link-service';
import { z } from 'zod';

const createSchema = z.object({
  event_id: z.string().uuid(),
  custom_code: z.string().min(3).max(20).regex(/^[a-z0-9-]+$/).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id') || undefined;

      const links = await registrationLinkService.list(clientId, eventId);
      return NextResponse.json({ links });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = createSchema.parse(body);
      const link = await registrationLinkService.create(clientId, parsed);
      return NextResponse.json({ link }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

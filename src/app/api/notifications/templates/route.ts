import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { notificationService } from '@/lib/notification-service';
import { z } from 'zod';

const templateSchema = z.object({
  event_id: z.string().uuid().optional(),
  type: z.string().min(1),
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id') || undefined;

      const templates = await notificationService.listTemplates(clientId, eventId);
      return NextResponse.json({ templates });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = templateSchema.parse(body) as any;
      const template = await notificationService.createTemplate(clientId, parsed);
      return NextResponse.json({ template }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { notificationService } from '@/lib/notification-service';
import { z } from 'zod';

const sendSchema = z.object({
  event_id: z.string().uuid().optional(),
  recipient_email: z.string().email(),
  recipient_name: z.string().optional(),
  type: z.string().min(1),
  template_id: z.string().uuid().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  scheduled_at: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id') || undefined;
      const type = searchParams.get('type') || undefined;
      const status = searchParams.get('status') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = await notificationService.list(clientId, {
        event_id: eventId,
        type,
        status,
        limit,
        offset,
      });

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();

      // Check if bulk
      if (Array.isArray(body.recipients)) {
        const result = await notificationService.sendBulk(clientId, {
          event_id: body.event_id,
          recipients: body.recipients,
          type: body.type,
          template_id: body.template_id,
          subject: body.subject,
          body: body.body,
          scheduled_at: body.scheduled_at,
        });
        return NextResponse.json(result, { status: result.errors.length > 0 ? 207 : 201 });
      }

      // Single send
      const parsed = sendSchema.parse(body) as any;
      const notification = await notificationService.send(clientId, parsed);
      return NextResponse.json({ notification }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

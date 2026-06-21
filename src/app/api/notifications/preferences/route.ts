import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { notificationService } from '@/lib/notification-service';
import { z } from 'zod';

const preferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  marketing_enabled: z.boolean().optional(),
  reminder_enabled: z.boolean().optional(),
  certificate_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const preferences = await notificationService.getPreferences(userId, clientId);
      return NextResponse.json({ preferences });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = preferencesSchema.parse(body);
      const preferences = await notificationService.updatePreferences(userId, clientId, parsed);
      return NextResponse.json({ preferences });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

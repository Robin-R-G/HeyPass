import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { webhookService } from '@/lib/webhook-service';
import { z } from 'zod';

const createSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const endpoints = await webhookService.list(clientId);
      return NextResponse.json({ endpoints });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = createSchema.parse(body) as any;
      const endpoint = await webhookService.create(clientId, parsed);
      return NextResponse.json({ endpoint }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

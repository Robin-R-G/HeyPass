import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { apiKeyService, type CreateApiKeyInput } from '@/lib/api-key-service';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  event_id: z.string().uuid().optional(),
  scope: z.enum(['full', 'event', 'read_only', 'webhook']).default('full'),
  permissions: z.array(z.string()).optional(),
  rate_limit: z.number().min(100).max(100000).optional(),
  ip_whitelist: z.array(z.string()).optional(),
  expires_at: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id') || undefined;

      const keys = await apiKeyService.list(clientId, eventId);
      return NextResponse.json({ keys });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = createSchema.parse(body) as CreateApiKeyInput;
      const result = await apiKeyService.create(clientId, parsed);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

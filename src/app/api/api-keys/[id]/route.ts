import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { apiKeyService } from '@/lib/api-key-service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  event_id: z.string().uuid().optional(),
  scope: z.enum(['full', 'event', 'read_only', 'webhook']).optional(),
  permissions: z.array(z.string()).optional(),
  rate_limit: z.number().min(100).max(100000).optional(),
  ip_whitelist: z.array(z.string()).optional(),
  expires_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const key = await apiKeyService.get(clientId, id);
      if (!key) {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
      return NextResponse.json({ key });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = updateSchema.parse(body) as any;
      const key = await apiKeyService.update(clientId, id, parsed);
      return NextResponse.json({ key });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      await apiKeyService.delete(clientId, id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

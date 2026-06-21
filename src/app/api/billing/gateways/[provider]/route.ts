import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { gatewayConfigService } from '@/lib/gateway-config-service';
import { z } from 'zod';

const updateSchema = z.object({
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  webhook_secret: z.string().optional(),
  is_live: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { provider } = await params;
      const body = await req.json();
      const parsed = updateSchema.parse(body);
      const gateway = await gatewayConfigService.update(clientId, provider, parsed);
      return NextResponse.json({ gateway });
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
  { params }: { params: Promise<{ provider: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { provider } = await params;
      await gatewayConfigService.delete(clientId, provider);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

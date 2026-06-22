import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { gatewayConfigService } from '@/lib/gateway-config-service';
import { z } from 'zod';

const createSchema = z.object({
  provider: z.enum(['razorpay', 'cashfree']),
  api_key: z.string().min(1),
  api_secret: z.string().min(1),
  webhook_secret: z.string().optional(),
  is_live: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const gateways = await gatewayConfigService.list(clientId);
      return NextResponse.json({ gateways });
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
      const gateway = await gatewayConfigService.create(clientId, parsed);
      return NextResponse.json({ gateway }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

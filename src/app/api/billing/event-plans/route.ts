import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { subscriptionService } from '@/lib/subscription-service';
import { z } from 'zod';

const purchaseSchema = z.object({
  event_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  payment_reference: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const plans = await subscriptionService.listSingleEventPlans();
      return NextResponse.json({ plans });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = purchaseSchema.parse(body);
      const subscription = await subscriptionService.purchaseEventPlan(
        clientId,
        parsed.event_id,
        parsed.plan_id,
        parsed.payment_reference
      );
      return NextResponse.json({ subscription }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

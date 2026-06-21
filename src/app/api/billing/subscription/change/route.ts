import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { subscriptionService } from '@/lib/subscription-service';
import { z } from 'zod';

const changeSchema = z.object({
  plan_id: z.string().uuid(),
  billing_cycle: z.enum(['monthly', 'annual']).optional(),
});

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();
      const parsed = changeSchema.parse(body);

      // Check if existing subscription
      const current = await subscriptionService.getSubscription(clientId);

      if (current && current.status === 'active') {
        // Change plan
        const subscription = await subscriptionService.changePlan(clientId, parsed.plan_id);
        return NextResponse.json({ subscription, action: 'changed' });
      } else {
        // Create new subscription
        const cycle = parsed.billing_cycle || 'monthly';
        const subscription = await subscriptionService.createSubscription(clientId, parsed.plan_id, cycle);
        return NextResponse.json({ subscription, action: 'created' }, { status: 201 });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

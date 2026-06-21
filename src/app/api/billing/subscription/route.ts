import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { subscriptionService } from '@/lib/subscription-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const [plans, subscription, usage] = await Promise.all([
        subscriptionService.listPlans(),
        subscriptionService.getSubscription(clientId),
        subscriptionService.getUsage(clientId),
      ]);

      return NextResponse.json({ plans, subscription, usage });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
